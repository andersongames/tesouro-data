import { parseTesouroCSV } from "../parsers/tesouro.parser"
import { TesouroCache, TesouroTitulo } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv"

// Cache TTL (1 hour)
const CACHE_TTL = 1000 * 60 * 60

/**
 * In-memory cache structure
 */
let cache: TesouroCache | null = null

/**
 * Used to prevent multiple simultaneous fetches
 */
let inFlightPromise: Promise<TesouroCache> | null = null

/**
 * Fetches the Tesouro Direto CSV file
 */
async function fetchTesouroCSV(): Promise<string> {
  /**
   * IMPORTANT:
   * Next.js fetch cache is NOT used here because:
   * - The CSV file exceeds the 2MB cache limit
   * - This would cause cache failures and unnecessary re-fetches
   *
   * Instead, we rely on our own in-memory cache layer
   */
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
 * Builds a Map for O(1) lookup where each key contains
 * a list of historical entries for the same title
 *
 * Key format:
 *   tipoSlug|vencimentoISO
 *
 * Value:
 *   Array of TesouroTitulo sorted by dataBase DESC (most recent first)
 */
function buildTituloMap(
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
 * Loads fresh data (fetch + parse + index)
 */
async function loadTesouroData(): Promise<TesouroCache> {
  const csv = await fetchTesouroCSV()
  const parsed = parseTesouroCSV(csv)

  const map = buildTituloMap(parsed)

  const fetchedAt = new Date().toISOString()

  return {
    data: parsed,
    map,
    fetchedAt,
    expiresAt: Date.now() + CACHE_TTL,
  }
}

/**
 * Main function to get cached Tesouro data
 *
 * - Uses in-memory cache
 * - Prevents duplicate fetches
 * - Automatically refreshes after TTL
 */
export async function getTesouroData(): Promise<TesouroCache> {
  const now = Date.now()

  // Return cache if valid
  if (cache && cache.expiresAt > now) {
    return cache
  }

  /**
   * If a fetch is already in progress, reuse it
   * This avoids multiple concurrent downloads
   */
  if (inFlightPromise) {
    return inFlightPromise
  }

  /**
   * Start a new fetch
   */
  inFlightPromise = loadTesouroData()
    .then((result) => {
      cache = result
      return result
    })
    .catch((error) => {
      /**
       * Fallback strategy:
       * If fetching fresh data fails, return stale cache (if available)
       * This improves resilience against temporary external failures
       */
      if (cache) {
        console.warn("[TesouroData] Using stale cache due to fetch error", {
          error,
          fetchedAt: cache.fetchedAt,
          expired: cache.expiresAt < Date.now(),
        })

        return cache
      }

      throw error
    })
    .finally(() => {
      inFlightPromise = null
    })

  return inFlightPromise
}

/**
 * Finds a Tesouro title using normalized key
 *
 * If dataBase is provided:
 *   - returns the exact match for that date
 *
 * If dataBase is NOT provided:
 *   - returns the most recent entry (index 0)
 */
export async function findTesouroTitulo(
  tipo: string,
  vencimentoISO: string,
  dataBase?: string
) {
  const { map, fetchedAt } = await getTesouroData()

  const key = normalizeTituloKey(tipo, vencimentoISO)

  const list = map.get(key)

  if (!list || list.length === 0) {
    return null
  }

  /**
   * If no dataBase is provided, return the most recent entry
   */
  if (!dataBase) {
    return {
      ...list[0],
      fetchedAt,
    }
  }

  /**
   * Find exact match for the requested dataBase
   */
  const match = list.find((item) => item.dataBase === dataBase)

  if (!match) {
    return null
  }

  return {
    ...match,
    fetchedAt,
  }
}