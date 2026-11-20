import { generateDataset } from "./helpers/dataset-generator.helper"

async function run() {
  try {
    await generateDataset({
      source: "live",
      outputMode: "partitioned-by-year",
    })
  } catch (error) {
    console.error("❌ Error generating dataset from live source:", error)
    process.exit(1)
  }
}

run()