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
function partitionMapByMaturityYear(tituloMap: Map<string, TesouroTitulo[]>): Map<string, Map<string, TesouroTitulo[]>> {
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
 * Core function to generate and save datasets based on specified options.
 */
export async function generateDataset(options: GenerationOptions): Promise<void> {
  console.log(`🔍 Starting dataset generation (Source: ${options.source}, Mode: ${options.outputMode})...`)

  const csvContent = await fetchCsvContent(options.source)
  console.log("⚙️ Parsing CSV data and building maps...")
  
  const parsedData = parseTesouroCSV(csvContent)
  const tituloMap = buildTituloMap(parsedData)

  const outputDir = options.customOutputDir || path.join(process.cwd(), "src/lib/data/datasets")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

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