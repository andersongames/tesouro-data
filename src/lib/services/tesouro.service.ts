import { unstable_cache, revalidateTag } from "next/cache"
import { parseTesouroCSV } from "../parsers/tesouro.parser"
import { TesouroCache, TesouroTitulo, TesouroTituloHistorico } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"
import { TESOURO_CSV_URL } from "../constants"

/**
 * TTL for the remote HEAD check wrapped in Next.js cache (e.g., 5 minutes = 300 seconds).
 * This ensures that across distributed serverless instances, the HEAD check 
 * is globally throttled by the Next.js Data Cache layer.
 */
const HEAD_CACHE_TTL_SECONDS = 5 * 60

// Cache TTL set to 1 hour (expressed in seconds for unstable_cache)
const CACHE_TTL_SECONDS = 60 * 60

/**
 * Short local RAM TTLs for fast in-memory lookups (avoiding distributed cache overhead).
 */
const LOCAL_RAM_HEAD_TTL_MS = 30 * 1000 // 30 seconds
const LOCAL_RAM_CHUNKS_TTL_MS = 60 * 1000 // 1 minute

// Maximum lines per chunk to keep each cached payload safely under Next.js' ~2MB limit.
const MAX_LINES_PER_CHUNK = 19_173

/**
 * Local memory state used as a local-first RAM cache and fallback.
 */
const localFallbackState: {
  chunks: string[] | null
  inFlightPromise: Promise<string[]> | null
  inFlightHeadPromise: Promise<string | null> | null
  lastModifiedCache: string | null
  lastHeadCheckTimestamp: number
  chunksTimestamp: number
} = {
  chunks: null,
  inFlightPromise: null,
  inFlightHeadPromise: null,
  lastModifiedCache: null,
  lastHeadCheckTimestamp: 0,
  chunksTimestamp: 0,
}

// Performs a lightweight HEAD request using the global distributed cache layer.
async function fetchLastModified(): Promise<string | null> {
  const response = await fetch(TESOURO_CSV_URL, {
    method: "HEAD",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Tesouro CSV: ${response.status}`)
  }

  return response.headers.get("last-modified") || response.headers.get("etag")
}

/**
 * Fetches Last Modified locally.
 * Uses in-flight request coalescing to prevent duplicate concurrent HEAD requests
 * and falls back to Next.js unstable_cache when available.
 */
async function getLocalLastModified(): Promise<string | null> {
  if (localFallbackState.lastModifiedCache) {
    return localFallbackState.lastModifiedCache
  }

  // Coalesce concurrent calls in-memory (vital for tests and high concurrency)
  if (localFallbackState.inFlightHeadPromise) {
    return localFallbackState.inFlightHeadPromise
  }

  localFallbackState.inFlightHeadPromise = (async () => {
    try {
      const lastModified = await fetchLastModified()
  
      return lastModified
    } catch (error) {
        console.warn("[TesouroData] Failed to direct fetch remote HEAD headers:", error)
        return null
    }
  })().finally(() => {
    localFallbackState.inFlightHeadPromise = null
  })

  return localFallbackState.inFlightHeadPromise
}

/**
 * Cached function to fetch the remote Last-Modified header globally,
 * implementing a Local-First RAM cache to skip distributed lookups for frequent calls.
 */
async function getCachedLastModified(): Promise<string | null> {
  const now = Date.now()

  // LOCAL FIRST: If the last HEAD check was performed recently in this instance's RAM,
  // return it immediately in microseconds without touching the distributed cache layer.
  if (
    localFallbackState.lastModifiedCache &&
    now - localFallbackState.lastHeadCheckTimestamp < LOCAL_RAM_HEAD_TTL_MS
  ) {
    return localFallbackState.lastModifiedCache
  }

  try {
    const result = await unstable_cache(
      async () => {
        console.log("[TesouroData] GLOBAL CACHE EXPIRED - Executing remote HEAD request...")
        return getLocalLastModified()
      },
      ["tesouro-remote-head-check"],
      { revalidate: HEAD_CACHE_TTL_SECONDS, tags: ["tesouro-head-cache"] }
    )()

    // Update local RAM timestamp on successful retrieval
    localFallbackState.lastHeadCheckTimestamp = Date.now()
    return result
  } catch (error) {
    console.warn("[TesouroData] unstable_cache unavailable or failed, using local in-flight coalescing:", error)
    const result = await getLocalLastModified()
    localFallbackState.lastHeadCheckTimestamp = Date.now()
    return result
  }
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
 * Validates remote changes via HEAD request and invalidates cache tag if updated.
 */
async function validateAndPurgeCacheIfNeeded(): Promise<void> {
  const remoteModified = await getCachedLastModified()

  console.log(`[TesouroData] Remote dataset date: ${remoteModified}`)

  if (remoteModified && localFallbackState.lastModifiedCache) {
    if (remoteModified !== localFallbackState.lastModifiedCache) {
      console.log("[TesouroData] Remote dataset updated! Purging cache tag...")
      revalidateTag("tesouro-cache","max")
      localFallbackState.chunks = null // Reset local memory fallback
    }
  }

  if (remoteModified) {
    localFallbackState.lastModifiedCache = remoteModified
  }
}

/**
 * Cached function to retrieve total lines and chunk count using Local-First RAM priority.
 */
const getCachedTotalChunks = async (): Promise<number> => {
  const now = Date.now()

  // LOCAL FIRST: Return chunk length directly from RAM if within the short local TTL.
  if (
    localFallbackState.chunks &&
    now - localFallbackState.chunksTimestamp < LOCAL_RAM_CHUNKS_TTL_MS
  ) {
    return localFallbackState.chunks.length
  }

  await validateAndPurgeCacheIfNeeded()

  try {
    const total = await unstable_cache(
      async () => {
        console.log("[TesouroData] CACHE EXPIRED (or CACHE MISS) - fetching fresh total chunks")
        const chunks = await getLocalChunks()
        localFallbackState.chunksTimestamp = Date.now()
        return chunks.length
      },
      ["tesouro-total-chunks"],
      { revalidate: CACHE_TTL_SECONDS, tags: ["tesouro-cache"] }
    )()
    return total
  } catch (error) {
    console.warn("[TesouroData] unstable_cache failed for total chunks, using local fallback:", error)
    const chunks = await getLocalChunks()
    localFallbackState.chunksTimestamp = Date.now()
    return chunks.length
  }
}

/**
 * Cached function to retrieve a specific chunk by its index with Local-First RAM priority.
 */
const getCachedChunkByIndex = async (chunkIndex: number): Promise<string> => {
  const now = Date.now()

  // LOCAL FIRST: Serve chunk directly from instance memory if chunks are fresh in RAM.
  if (
    localFallbackState.chunks &&
    now - localFallbackState.chunksTimestamp < LOCAL_RAM_CHUNKS_TTL_MS
  ) {
    return localFallbackState.chunks[chunkIndex] || ""
  }

  try {
    return await unstable_cache(
      async () => {
        console.log(`[TesouroData] CACHE EXPIRED (or CACHE MISS) - fetching fresh chunk ${chunkIndex}`)
        const chunks = await getLocalChunks()
        localFallbackState.chunksTimestamp = Date.now()
        return chunks[chunkIndex] || ""
      },
      [`tesouro-chunk-content-${chunkIndex}`],
      { revalidate: CACHE_TTL_SECONDS, tags: ["tesouro-cache"] }
    )()
  } catch (error) {
    console.warn(`[TesouroData] unstable_cache failed for chunk ${chunkIndex}, using local fallback:`, error)
    const chunks = await getLocalChunks()
    localFallbackState.chunksTimestamp = Date.now()
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