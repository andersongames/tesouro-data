import { unstable_cache } from "next/cache"
import { parseTesouroCSV } from "../parsers/tesouro.parser"
import { TesouroCache, TesouroTitulo, TesouroTituloHistorico } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv"

// Cache TTL set to 1 hour (expressed in seconds for unstable_cache)
const CACHE_TTL_SECONDS = 60 * 60

// Maximum lines per chunk to keep each cached payload safely under Next.js' ~2MB limit.
const MAX_LINES_PER_CHUNK = 19_173

/**
 * Local memory state used as a fallback for test environments or non-Next runtimes
 * where unstable_cache runtime is unavailable.
 */
const localFallbackState: {
  chunks: string[] | null
  inFlightPromise: Promise<string[]> | null
} = {
  chunks: null,
  inFlightPromise: null,
}

/**
 * Fetches the raw Tesouro Direto CSV file from the official source.
 * Logs only when an actual external HTTP request occurs.
 */
async function fetchRawTesouroCSV(): Promise<string> {
  console.log("[TesouroData] Downloading CSV from source...")

  const response = await fetch(TESOURO_CSV_URL, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Tesouro CSV: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const decoder = new TextDecoder("latin1")

  return decoder.decode(buffer)
}

/**
 * Pure function that splits a raw CSV string into an array of text chunks.
 * Keeps each chunk safely under the ~2MB cache size limit.
 */
export function chunkCSV(csv: string, maxLinesPerChunk: number = MAX_LINES_PER_CHUNK): string[] {
  const lines = csv.split(/\r?\n/)
  const chunks: string[] = []

  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    const chunkLines = lines.slice(i, i + maxLinesPerChunk)
    const chunk = chunkLines.join("\n")

    if (chunk.length > 0) {
      chunks.push(chunk)
    }
  }

  return chunks
}

/**
 * Fetches and splits the CSV into chunks locally (used by the fallback mechanism).
 */
async function getLocalChunks(): Promise<string[]> {
  if (localFallbackState.chunks) {
    return localFallbackState.chunks
  }

  if (localFallbackState.inFlightPromise) {
    return localFallbackState.inFlightPromise
  }

  localFallbackState.inFlightPromise = (async () => {
    const fullCsv = await fetchRawTesouroCSV()
    
    console.log("[TesouroData] Splitting CSV in chunks (Local Fallback)...")
    const chunks = chunkCSV(fullCsv)

    localFallbackState.chunks = chunks
    return chunks
  })().finally(() => {
    localFallbackState.inFlightPromise = null
  })

  return localFallbackState.inFlightPromise
}

/**
 * Cached function to retrieve total lines and chunk count with local fallback..
 */
const getCachedTotalChunks = async (): Promise<number> => {
  try {
    return await unstable_cache(
      async () => {
        const chunks = await getLocalChunks()
        return chunks.length
      },
      ["tesouro-total-chunks"],
      { revalidate: CACHE_TTL_SECONDS, tags: ["tesouro-cache"] }
    )()
  } catch (error) {
    console.warn("[TesouroData] unstable_cache failed for total chunks, using local fallback:", error)
    const chunks = await getLocalChunks()
    return chunks.length
  }
}

/**
 * Cached function to retrieve a specific chunk by its index with local fallback.
 * The index is automatically part of the cache key generation in Next.js.
 */
const getCachedChunkByIndex = async (chunkIndex: number): Promise<string> => {
  try {
    return await unstable_cache(
      async () => {
        const chunks = await getLocalChunks()
        return chunks[chunkIndex] || ""
      },
      [`tesouro-chunk-content-${chunkIndex}`],
      { revalidate: CACHE_TTL_SECONDS, tags: ["tesouro-cache"] }
    )()
  } catch (error) {
    console.warn(`[TesouroData] unstable_cache failed for chunk ${chunkIndex}, using local fallback:`, error)
    const chunks = await getLocalChunks()
    return chunks[chunkIndex] || ""
  }
}

/**
 * Builds a Map for O(1) lookup where each key contains
 * a list of historical entries for the same title
 *
 * Key format:
 *   tipoSlug|vencimentoISO
 *
 * Value:
 *   Array of TesouroTitulo sorted by dataBase DESC (most recent first)
 */
export function buildTituloMap(
  data: TesouroTitulo[]
): Map<string, TesouroTitulo[]> {
  const map = new Map<string, TesouroTitulo[]>()

  for (const titulo of data) {
    const key = normalizeTituloKey(titulo.tipo, titulo.vencimento)

    /**
     * If the key does not exist yet, initialize with empty array
     */
    if (!map.has(key)) {
      map.set(key, [])
    }

    /**
     * Push the current record into the list
     */
    map.get(key)!.push(titulo)
  }

  /**
   * Sort each list by dataBase DESC (most recent first)
   *
   * This ensures that:
   * - index 0 is always the latest data
   * - faster access for default queries
   */
  for (const list of map.values()) {
    list.sort((a, b) => {
      // Compare ISO dates (string comparison works correctly here)
      return b.dataBase.localeCompare(a.dataBase)
    })
  }

  return map
}

/**
 * Extracts the most recent "dataBase" from parsed data
 *
 * Assumes:
 * - dataBase is in ISO format (YYYY-MM-DD)
 * - string comparison works for ordering
 */
function getLatestDataBase(data: TesouroTitulo[]): string | null {
  if (!data.length) return null

  let latest = data[0].dataBase

  for (const item of data) {
    if (item.dataBase > latest) {
      latest = item.dataBase
    }
  }

  return latest
}

/**
 * Main function to retrieve and assemble cached Tesouro data.
 * Replaces the local in-memory lock with a distributed Next.js cache.
 */
export async function getTesouroData(): Promise<TesouroCache> {
  /**
   * 1. Get total number of chunks from the distributed cache.
   * This serves as the global coalescing point across serverless instances.
   */
  const totalChunks = await getCachedTotalChunks()

  /**
   * If the dataset is empty, return an empty cache payload without parsing an invalid CSV string.
   */
  if (totalChunks === 0) {
    const fetchedAt = new Date().toISOString()

    return {
      data: [],
      map: new Map<string, TesouroTitulo[]>(),
      fetchedAt,
      latestDataBase: null,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    }
  }

  /**
   * 2. Fetch all chunks in parallel from the cache layers.
   */
  const chunkPromises: Promise<string>[] = []

  for (let i = 0; i < totalChunks; i++) {
    chunkPromises.push(getCachedChunkByIndex(i))
  }

  const resolvedChunks = await Promise.all(chunkPromises)

  /**
   * 3. Reassemble the full CSV string in memory and parse it using the existing parser.
   */
  const fullCsvString = resolvedChunks.join("\n")
  const parsed = parseTesouroCSV(fullCsvString)
  const map = buildTituloMap(parsed)
  const latestDataBase = getLatestDataBase(parsed)
  const fetchedAt = new Date().toISOString()

  return {
    data: parsed,
    map,
    fetchedAt,
    latestDataBase,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  }
}

/**
 * Finds historical entries for a Tesouro title using normalized key
 *
 * Supports optional filtering:
 *   - from: filters entries with dataBase >= from (inclusive)
 *   - to: filters entries with dataBase <= to (inclusive)
 *   - limit: limits the number of returned entries (after filtering)
 *
 * Behavior:
 *   - Results are always sorted by dataBase DESC (most recent first)
 *   - If no filters are provided, returns full history
 *   - Filters are applied before limit
 *
 * Returns:
 *   - Filtered list of entries
 *   - fetchedAt timestamp (when data was retrieved)
 *   - total number of items before filters/limit
 *
 * Notes:
 *   - Dates must be in ISO format (YYYY-MM-DD)
 *   - If no entries are found, returns null
 */
export async function findTesouroTitulo(
  tipo: string,
  vencimentoISO: string,
  options?: {
    from?: string
    to?: string
    limit?: number
  }
): Promise<TesouroTituloHistorico | null> {
  const { map, fetchedAt } = await getTesouroData()

  const key = normalizeTituloKey(tipo, vencimentoISO)

  const list = map.get(key)

  if (!list || list.length === 0) {
    return null
  }

  let filtered = list

  /**
   * Apply "from" filter (inclusive)
   */
  if (options?.from) {
    filtered = filtered.filter(
      (item) => item.dataBase >= options.from!
    )
  }

  /**
   * Apply "to" filter (inclusive)
   */
  if (options?.to) {
    filtered = filtered.filter(
      (item) => item.dataBase <= options.to!
    )
  }

  /**
   * Apply limit AFTER filtering
   */
  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return {
    items: filtered,
    fetchedAt,
    total: list.length,
  }
}