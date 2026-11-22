import { TesouroMetadata } from "../../../scripts/helpers/dataset-generator.helper"
import { TesouroCache, TesouroTitulo, TesouroTituloHistorico } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"
import fs from "fs"
import path from "path"

// Cache TTL set to 1 hour (expressed in milliseconds for expiration timestamp)
const CACHE_TTL_SECONDS = 60 * 60

/**
 * Loads the pre-generated static map for a specific maturity year from the local datasets directory.
 * Returns null if the file does not exist or fails to parse.
 */
function loadLocalYearStaticMap(year: string): Map<string, TesouroTitulo[]> | null {
  const mapFilePath = path.join(process.cwd(), "src/lib/data/datasets", `tesouro-${year}.json`)

  if (!fs.existsSync(mapFilePath)) {
    console.warn(`[TesouroData] Local static map file for year ${year} not found at: ${mapFilePath}.`)
    return null
  }

  try {
    const fileContent = fs.readFileSync(mapFilePath, "utf-8")
    const entries: [string, TesouroTitulo[]][] = JSON.parse(fileContent)
    return new Map(entries)
  } catch (error) {
    console.warn(`[TesouroData] Failed to parse local static map file for year ${year}:`, error)
    return null
  }
}

/**
 * Loads and merges all partitioned static maps from the local datasets directory.
 */
function loadAllLocalStaticMaps(): Map<string, TesouroTitulo[]> | null {
  const datasetsDir = path.join(process.cwd(), "src/lib/data/datasets")

  if (!fs.existsSync(datasetsDir)) {
    console.warn(`[TesouroData] Datasets directory not found at: ${datasetsDir}.`)
    return null
  }

  try {
    const files = fs.readdirSync(datasetsDir).filter(file => file.startsWith("tesouro-") && file.endsWith(".json"))
    const combinedMap = new Map<string, TesouroTitulo[]>()

    for (const file of files) {
      const filePath = path.join(datasetsDir, file)
      const fileContent = fs.readFileSync(filePath, "utf-8")
      const entries: [string, TesouroTitulo[]][] = JSON.parse(fileContent)
      for (const [key, titles] of entries) {
        combinedMap.set(key, titles)
      }
    }

    return combinedMap
  } catch (error) {
    console.warn("[TesouroData] Failed to load all local static maps:", error)
    return null
  }
}

/**
 * Loads pre-generated dataset metadata from the local datasets directory.
 * Returns safe fallback values if the file does not exist or fails to parse.
 */
export function loadLocalMetadata(): TesouroMetadata {
  const fallbackDate = new Date().toISOString()
  const metadataFilePath = path.join(process.cwd(), "src/lib/data/datasets/metadata.json")

  if (!fs.existsSync(metadataFilePath)) {
    console.warn(`[TesouroData] Metadata file not found at: ${metadataFilePath}. Using fallback values.`)
    return { lastUpdatedAt: fallbackDate, latestDataBase: null, dataSource: "unknown" }
  }

  try {
    const fileContent = fs.readFileSync(metadataFilePath, "utf-8")
    const metadata = JSON.parse(fileContent)
    return {
      lastUpdatedAt: metadata.lastUpdatedAt || fallbackDate,
      latestDataBase: metadata.latestDataBase || null,
      dataSource: metadata.dataSource || "unknown",
    }
  } catch (error) {
    console.warn("[TesouroData] Failed to parse metadata file:", error)
    return { lastUpdatedAt: fallbackDate, latestDataBase: null, dataSource: "unknown" }
  }
}

/**
 * Retrieves and assembles cached Tesouro data from local static files.
 */
export async function getTesouroData(): Promise<TesouroCache> {
  const localMap = loadAllLocalStaticMaps()
  const metadata = loadLocalMetadata()

  if (!localMap) {
    return {
      data: [],
      map: new Map<string, TesouroTitulo[]>(),
      lastUpdatedAt: metadata.lastUpdatedAt,
      latestDataBase: metadata.latestDataBase,
      dataSource: metadata.dataSource,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    }
  }

  // Flatten map entries back into the data array if needed, or extract latest date
  const allData: TesouroTitulo[] = []
  for (const items of localMap.values()) {
    allData.push(...items)
  }

  console.log("[TesouroData] getTesouroData - Serving from local static map file...")
  return {
    data: allData,
    map: localMap,
    lastUpdatedAt: metadata.lastUpdatedAt,
    latestDataBase: metadata.latestDataBase,
    dataSource: metadata.dataSource,
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
 * Finds historical entries for a Tesouro title using local partitioned static files.
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
 *   - lastUpdatedAt timestamp (when map data was generated)
 *   - latestDataBase date of the latest record on the dataset
 *   - dataSource "live" if the data was generated from the retrieved
 *     CSV from the official source or 'local" if it was generated from a local file
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
  const maturityYear = vencimentoISO.slice(0, 4)

  const localMap = loadLocalYearStaticMap(maturityYear)
  const metadata = loadLocalMetadata()

  // If the year file does not exist or the title key is not present, return null immediately (no fallback)
  if (!localMap || !localMap.has(targetKey)) {
    return null
  }

  const list = localMap.get(targetKey)
  if (!list || list.length === 0) {
    return null
  }

  const filtered = filterTituloHistory(list, options)

  console.log("[TesouroData] findTesouroTitulo - Returning data...")
  return {
    items: filtered,
    lastUpdatedAt: metadata.lastUpdatedAt,
    latestDataBase: metadata.latestDataBase,
    dataSource: metadata.dataSource,
    total: list.length,
  }
}
