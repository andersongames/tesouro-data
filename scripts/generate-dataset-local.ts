import { generateDataset } from "./helpers/dataset-generator.helper"

async function run() {
  try {
    await generateDataset({
      source: "local",
      outputMode: "partitioned-by-year",
    })
  } catch (error) {
    console.error("❌ Error generating dataset from local source:", error)
    process.exit(1)
  }
}

run()