import { performance } from "perf_hooks"
import fs from "fs"
import path from "path"

const BASE_URL =
  "http://localhost:3000/api/titulo?tipo=Tesouro%20IPCA%2B%20com%20Juros%20Semestrais&vencimento=2045-05-15"

interface PerformanceResult {
  label: string
  duration: number
  totalRecords: number | null
  success: boolean
}

async function measureRequest(label: string, url: string = BASE_URL): Promise<PerformanceResult> {
  const start = performance.now()
  try {
    const response = await fetch(url)
    const data = await response.json()
    const end = performance.now()
    const duration = end - start

    const totalRecords = data.total ?? null
    console.log(`[${label}] Status: ${response.status} | Time: ${duration.toFixed(2)}ms | Total Records: ${totalRecords}`)
    
    return { label, duration, totalRecords, success: response.ok }
  } catch (error) {
    console.error(`[${label}] Request failed:`, error)
    return { label, duration: 0, totalRecords: null, success: false }
  }
}

async function runPerformanceTests() {
  console.log("🚀 Starting performance tests...")
  console.log("Make sure the Next.js server is running (npm run dev)\n")

  const results: PerformanceResult[] = []

  // 1. Scenario: First request (Cold Cache / Potential CSV download)
  console.log("--- Test 1: Cold Request ---")
  results.push(await measureRequest("Cold Request", BASE_URL))

  // Short pause between requests
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 2. Scenario: Subsequent standard requests (Warm Cache / Memory or Cache hit)
  console.log("\n--- Test 2: Standard Warm Requests ---")
  results.push(await measureRequest("Warm Request #1", BASE_URL))
  results.push(await measureRequest("Warm Request #2", BASE_URL))

  // Short pause before the lazy reading test
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 3. Scenario: Lazy Reading Performance Test (&limit=1)
  console.log("\n--- Test 3: Lazy Reading Warm Request (&limit=1) ---")
  results.push(await measureRequest("Warm Request #3 (Lazy Reading)", `${BASE_URL}&limit=1`))

  // Ensure the output directory exists
  const resultsDir = path.join(process.cwd(), "performance-test-results")
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  // Generate a legible timestamp for the filename (Format: YYYY-MM-DD_HH-mm-ss)
  const now = new Date()
  const timestampTag = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19)

  const reportFilename = `performance-report_${timestampTag}.json`
  const reportPath = path.join(resultsDir, reportFilename)

  // Save the report data
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: now.toISOString(),
        results,
      },
      null,
      2
    )
  )

  console.log(`\n📁 Performance report successfully saved to: ${reportPath}`)
}

runPerformanceTests()