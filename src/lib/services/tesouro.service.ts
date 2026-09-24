import { unstable_cache, revalidateTag } from "next/cache"
import { chunkCSV, parseAndMapChunks } from "../parsers/tesouro.parser"
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
    console.log("[TesouroData] Serving HEAD from local RAM cache (TTL active)")
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

      // Safely attempt to revalidate the cache tag, catching errors outside Next.js runtime/tests
      try {
        revalidateTag("tesouro-cache", "max")
      } catch (error) {
        console.warn("[TesouroData] revalidateTag skipped or unavailable (test/non-Next environment):", error)
      }
      // Reset local memory fallback
      localFallbackState.chunks = null
    }
  }

  if (remoteModified) {
    localFallbackState.lastModifiedCache = remoteModified
  }
}

/**
 * Cached function to retrieve total lines and chunk count using Local-First RAM priority.
 */
async function getCachedTotalChunks(): Promise<number> {
  const now = Date.now()

  // LOCAL FIRST: Return chunk length directly from RAM if within the short local TTL.
  if (
    localFallbackState.chunks &&
    now - localFallbackState.chunksTimestamp < LOCAL_RAM_CHUNKS_TTL_MS
  ) {
    console.log("[TesouroData] Serving TotalChunks from local RAM cache (TTL active)")
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
async function getCachedChunkByIndex(chunkIndex: number): Promise<string> {
  const now = Date.now()

  // LOCAL FIRST: Serve chunk directly from instance memory if chunks are fresh in RAM.
  if (
    localFallbackState.chunks &&
    now - localFallbackState.chunksTimestamp < LOCAL_RAM_CHUNKS_TTL_MS
  ) {
    console.log("[TesouroData] Serving Chunk from local RAM cache (TTL active)")
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
   * If the dataset is empty, return an empty cache payload without parsing an invalid CSV string (edge case).
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
  const { data: parsed, map } = parseAndMapChunks(resolvedChunks)
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
 * Pure function that applies optional date range filters (from, to) 
 * and slice limits to a list of historical title entries.
 */
function filterTituloHistory(
  list: TesouroTitulo[],
  options?: {
    from?: string
    to?: string
    limit?: number
  }
): TesouroTitulo[] {
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

  return filtered
}

/**
 * Finds historical entries for a Tesouro title.
 * Applies a lazy reading strategy (checking only chunk 0) strictly when 
 * the caller requests only the single most recent record (limit === 1),
 * avoiding unnecessary full dataset parsing. Otherwise, falls back to full assembly.
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
  const targetKey = normalizeTituloKey(tipo, vencimentoISO)
  let list: TesouroTitulo[] | undefined = undefined
  let fetchedAt = new Date().toISOString()

  // LAZY READING CONDITION: Safe to use only when limit is explicitly 1 (fetching only the latest record)
  const isLazyEligible = options?.limit === 1 && !options?.from && !options?.to

  if (isLazyEligible) {
    const totalChunks = await getCachedTotalChunks()
    if (totalChunks > 0) {
      // Fetch only the first chunk where recent records reside
      const chunk0Content = await getCachedChunkByIndex(0)
      const { map: chunk0Map } = parseAndMapChunks([chunk0Content])

      if (chunk0Map.has(targetKey)) {
        list = chunk0Map.get(targetKey)
      }
    }
  }

  // FULL FALLBACK: If lazy search wasn't eligible, didn't match, or if a full history/range is requested
  if (!list || list.length === 0) {
    const fullData = await getTesouroData()
    fetchedAt = fullData.fetchedAt
    list = fullData.map.get(targetKey)
  }

  if (!list || list.length === 0) {
    return null
  }

  const filtered = filterTituloHistory(list, options)

  return {
    items: filtered,
    fetchedAt,
    total: list.length,
  }
}
