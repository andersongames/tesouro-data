import { buildTituloMap, parseTesouroCSV } from "@/lib/parsers/tesouro.parser"
import fs from "fs"
import path from "path"

const CSV_PATH = path.join(process.cwd(), "src/lib/data/precotaxatesourodireto.csv")
const OUTPUT_PATH = path.join(process.cwd(), "src/lib/data/tesouro-map.json")

function generateMapFile() {
  console.log("🔍 Checking source CSV file...")

  // Edge Case 1: The CSV file does not exist
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Error: CSV file not found at: ${CSV_PATH}`)
    console.error("Please make sure to place the CSV file in the correct directory before running the script.")
    process.exit(1)
  }

  try {
    console.log("📂 Reading CSV file...")
    const csvBuffer = fs.readFileSync(CSV_PATH)
    
    // Decode using latin1 (same standard as the original service)
    const decoder = new TextDecoder("latin1")
    const csvContent = decoder.decode(csvBuffer)

    console.log("⚙️ Parsing data and building the Map...")
    const parsedData = parseTesouroCSV(csvContent)
    const tituloMap = buildTituloMap(parsedData)

    // Since JavaScript Map cannot be serialized directly to JSON with JSON.stringify,
    // we convert it to an array of [key, value] entries
    const mapEntries = Array.from(tituloMap.entries())
    
    // Edge Case 2: If the JSON file already exists, it will be successfully overwritten (updated)
    if (fs.existsSync(OUTPUT_PATH)) {
      console.log("⚠️ Previous map file found. Overwriting with the new version...")
    }

    console.log("💾 Saving the serialized map file...")
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapEntries), "utf-8")

    console.log(`✅ Success! Map generated and saved to: ${OUTPUT_PATH}`)
    console.log(`📊 Total mapped keys: ${mapEntries.length}`)
  } catch (error) {
    console.error("❌ Unexpected error while generating the Tesouro map:", error)
    process.exit(1)
  }
}

generateMapFile()