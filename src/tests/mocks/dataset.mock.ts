/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs"
import path from "path"
import { vi } from "vitest"
import { parseTesouroCSV, buildTituloMap } from "@/lib/parsers/tesouro.parser"
import { TesouroTitulo } from "@/lib/types/tesouro.types"

/**
 * Creates a dataset mock helper using vi.spyOn to intercept file system calls
 * for local static datasets while safely falling back to real disk I/O for everything else.
 */
export function createDatasetMock() {
  const csvPath = path.resolve(process.cwd(), "src/tests/fixtures/tesouro.sample.csv")
  
  // Store original implementations safely before creating spies
  const originalExistsSync = fs.existsSync
  const originalReadFileSync = fs.readFileSync
  const originalReadDirSync = fs.readdirSync

  const rawCsv = originalReadFileSync(csvPath, "latin1")

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

  // Track active data state for the mock
  let currentHasData = true

  /**
   * Configures fs spies to mock static dataset files based on the CSV fixture,
   * safely delegating all other file system reads to the real Node fs implementation.
   */
  return function setupFsMock(hasData = true) {
    currentHasData = hasData

    vi.spyOn(fs, "existsSync").mockImplementation((filePath: fs.PathLike) => {
      const filePathStr = filePath.toString()

      if (filePathStr.includes("datasets")) {
        if (filePathStr.includes("metadata.json")) {
          return true
        }
        if (filePathStr.includes("tesouro-") && filePathStr.endsWith(".json")) {
          const yearMatch = filePathStr.match(/tesouro-(\d{4})\.json/)
          if (yearMatch && currentHasData) {
            return yearMaps.has(yearMatch[1])
          }
          return false
        }
      }

      return originalExistsSync(filePath)
    })

    vi.spyOn(fs, "readdirSync").mockImplementation((
      dirPath: fs.PathLike,
      options?: any
    ) => {
      const dirPathStr = dirPath.toString()

      if (dirPathStr.includes("datasets")) {
        if (!currentHasData) {
          return [] as any
        }
        // Return simulated JSON file names based on available year maps
        const simulatedFiles = Array.from(yearMaps.keys()).map(year => `tesouro-${year}.json`)
        simulatedFiles.push("metadata.json")
        return simulatedFiles as any
      }

      return originalReadDirSync(dirPath, options)
    })

    vi.spyOn(fs, "readFileSync").mockImplementation((
      filePath: fs.PathOrFileDescriptor,
      options?: BufferEncoding | (fs.ObjectEncodingOptions & { flag?: string | undefined; }) | null | undefined
    ) => {
      const filePathStr = filePath.toString()

      if (filePathStr.includes("datasets")) {
        if (!currentHasData) {
          return "[]"
        }

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
      }

      return originalReadFileSync(filePath, options)
    })
  }
}