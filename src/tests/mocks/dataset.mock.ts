import fs from "fs"
import path from "path"
import { vi } from "vitest"
import { parseTesouroCSV, buildTituloMap } from "@/lib/parsers/tesouro.parser"
import { TesouroTitulo } from "@/lib/types/tesouro.types"

/**
 * Creates a dataset mock helper using vi.spyOn to intercept file system calls
 * for local static datasets while preserving real file access for fixtures.
 */
export function createDatasetMock() {
  const csvPath = path.resolve(process.cwd(), "src/tests/fixtures/tesouro.sample.csv")
  const rawCsv = fs.readFileSync(csvPath, "latin1")

  const parsedData = parseTesouroCSV(rawCsv)
  const tituloMap = buildTituloMap(parsedData)

  // Partition the map entries by maturity year (YYYY)
  const yearMaps = new Map<string, Map<string, TesouroTitulo[]>>()

  for (const [key, titles] of tituloMap.entries()) {
    for (const title of titles) {
      const maturityYear = title.vencimento.slice(0, 4)

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

  const mockMetadata = {
    lastUpdatedAt: new Date().toISOString(),
    latestDataBase: "2026-03-31",
    dataSource: "local",
  }

  /**
   * Configures fs spies to mock static dataset files based on the CSV fixture.
   */
  return function setupFsMock(hasData = true) {
    vi.spyOn(fs, "existsSync").mockImplementation((filePath: fs.PathLike) => {
      const filePathStr = filePath.toString()

      if (filePathStr.includes("metadata.json")) {
        return true
      }

      if (filePathStr.includes("tesouro-") && filePathStr.endsWith(".json")) {
        const yearMatch = filePathStr.match(/tesouro-(\d{4})\.json/)
        if (yearMatch && hasData) {
          return yearMaps.has(yearMatch[1])
        }
        return false
      }

      return fs.existsSync(filePath)
    })

    vi.spyOn(fs, "readFileSync").mockImplementation((
      filePath: fs.PathOrFileDescriptor,
      options?: BufferEncoding | (fs.ObjectEncodingOptions & { flag?: string | undefined; }) | null | undefined
    ) => {
      const filePathStr = filePath.toString()

      if (filePathStr.includes("metadata.json")) {
        return JSON.stringify(mockMetadata)
      }

      if (filePathStr.includes("tesouro-") && filePathStr.endsWith(".json")) {
        const yearMatch = filePathStr.match(/tesouro-(\d{4})\.json/)
        if (yearMatch && yearMaps.has(yearMatch[1])) {
          const yearMap = yearMaps.get(yearMatch[1])!
          return JSON.stringify(Array.from(yearMap.entries()))
        }
        return "[]"
      }

      return fs.readFileSync(filePath, options)
    })
  }
}