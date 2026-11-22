import { buildTituloMap, parseTesouroCSV } from "@/lib/parsers/tesouro.parser"
import { TESOURO_CSV_URL } from "@/lib/constants"
import { TesouroTitulo } from "@/lib/types/tesouro.types"
import fs from "fs"
import path from "path"

interface GenerationOptions {
  source: "local" | "live"
  outputMode: "partitioned-by-year" | "single-file"
  customOutputDir?: string
}

export type TesouroMetadata = {
  lastUpdatedAt: string
  latestDataBase: string | null
  dataSource: string
  remoteVersion?: string | null
}

/**
 * Extracts the most recent "dataBase" date from parsed data entries.
 * 
 * Assumes:
 * - dataBase is in ISO format (YYYY-MM-DD)
 * - string comparison works for ordering
 */
export function getLatestDataBase(data: TesouroTitulo[]): string | null {
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
 * Fetches remote HEAD headers (Last-Modified or ETag) to check for updates without downloading the full CSV.
 */
async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(TESOURO_CSV_URL, {
      method: "HEAD",
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return response.headers.get("last-modified") || response.headers.get("etag")
  } catch (error) {
    console.warn("[DatasetGenerator] Failed to fetch remote HEAD version:", error)
    return null
  }
}

/**
 * Fetches the raw CSV content either from the local file system or live remote URL.
 */
async function fetchCsvContent(source: "local" | "live"): Promise<string> {
  if (source === "local") {
    const csvPath = path.join(process.cwd(), "src/lib/data/precotaxatesourodireto.csv")
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Local CSV file not found at: ${csvPath}`)
    }
    const buffer = fs.readFileSync(csvPath)
    return new TextDecoder("latin1").decode(buffer)
  } else {
    const response = await fetch(TESOURO_CSV_URL, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to download CSV from remote source: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    return new TextDecoder("latin1").decode(buffer)
  }
}

/**
 * Partitions a title map into separate maps grouped by the maturity year.
 */
export function partitionMapByMaturityYear(tituloMap: Map<string, TesouroTitulo[]>): Map<string, Map<string, TesouroTitulo[]>> {
  const yearMaps = new Map<string, Map<string, TesouroTitulo[]>>()

  for (const [key, titles] of tituloMap.entries()) {
    for (const title of titles) {
      const maturityYear = title.vencimento.slice(0, 4) // Extract YYYY from ISO date

      if (!yearMaps.has(maturityYear)) {
        yearMaps.set(maturityYear, new Map())
      }

      const yearMap = yearMaps.get(maturityYear)!
      if (!yearMap.has(key)) {
        yearMap.set(key, [])
      }
      yearMap.get(key)!.push(title)
    }
  }

  return yearMaps
}

/**
 * Core function to generate and save datasets based on specified options,
 * skipping heavy CSV download and processing if the source has not changed.
 */
export async function generateDataset(options: GenerationOptions): Promise<void> {
  console.log(`🔍 Starting dataset generation (Source: ${options.source}, Mode: ${options.outputMode})...`)

  const outputDir = options.customOutputDir || path.join(process.cwd(), "src/lib/data/datasets")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Get existing metadata
  const metadataPath = path.join(outputDir, "metadata.json")
  let existingMetadata: TesouroMetadata | null = null

  if (fs.existsSync(metadataPath)) {
    try {
      existingMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
    } catch {
      existingMetadata = null
    }
  }

  let currentRemoteVersion: string | null = null

  // If source is 'live', check HEAD request to avoid unnecessary downloads
  if (options.source === "live") {
    currentRemoteVersion = await fetchRemoteVersion()

    if (existingMetadata && existingMetadata.remoteVersion && existingMetadata.remoteVersion === currentRemoteVersion) {
      console.log("⚡ Remote CSV has not changed (matched HEAD version). Skipping CSV download and map generation.")
      
      const updatedMetadata = {
        lastUpdatedAt: new Date().toISOString(),
        latestDataBase: existingMetadata.latestDataBase,
        dataSource: options.source,
        remoteVersion: currentRemoteVersion,
      }
      
      fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2), "utf-8")
      console.log(`💾 Updated metadata timestamp at: ${metadataPath}`)
      return
    }
  } else {
    console.log("📂 Local source selected. Forcing full dataset generation...")
  }

  const csvContent = await fetchCsvContent(options.source)
  console.log("⚙️ Parsing CSV data and building maps...")
  
  const parsedData = parseTesouroCSV(csvContent)
  const tituloMap = buildTituloMap(parsedData)

  // Generate and save metadata.json
  const latestDataBase = getLatestDataBase(parsedData)
  const metadata = {
    lastUpdatedAt: new Date().toISOString(),
    latestDataBase,
    dataSource: options.source,
    remoteVersion: currentRemoteVersion,
  }
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8")
  console.log(`💾 Saved metadata to: ${metadataPath}`)

  if (options.outputMode === "partitioned-by-year") {
    const partitionedMaps = partitionMapByMaturityYear(tituloMap)
    let totalFilesSaved = 0

    for (const [year, yearMap] of partitionedMaps.entries()) {
      const filePath = path.join(outputDir, `tesouro-${year}.json`)
      const entries = Array.from(yearMap.entries())
      
      fs.writeFileSync(filePath, JSON.stringify(entries), "utf-8")
      totalFilesSaved++
      console.log(`💾 Saved year ${year} dataset to: ${filePath} (${entries.length} keys)`)
    }

    console.log(`✅ Success! Partitioned datasets generated. Total year files: ${totalFilesSaved}`)
  } else {
    // Fallback/Alternative single file generation if needed
    const singleFilePath = path.join(process.cwd(), "src/lib/data/tesouro-map.json")
    const entries = Array.from(tituloMap.entries())

    fs.writeFileSync(singleFilePath, JSON.stringify(entries), "utf-8")
    console.log(`✅ Success! Single map file generated at: ${singleFilePath}`)
  }
}