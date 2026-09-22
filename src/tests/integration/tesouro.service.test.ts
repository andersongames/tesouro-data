import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { chunkCSV, findTesouroTitulo } from "@/lib/services/tesouro.service"

import { mockFetch } from "../mocks/fetch.mock"

/**
 * Load CSV fixture
 */
const csvPath = resolve("src/tests/fixtures/tesouro.sample.csv")
const sampleCSV = readFileSync(csvPath, "utf-8")

describe("tesouro.service (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  /**
   * -------------------------------
   * CHUNK FUNCTION TESTS (Pure Function)
   * -------------------------------
   */
  it("should split the CSV into cache-safe chunks using the pure chunkCSV function", () => {
    const header = "Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha"
    const rows = Array.from({ length: 40_000 }, () => {
      const dataBase = "2026-03-31"
      const vencimento = "2028-03-01"

      return ["Tesouro Selic", vencimento, dataBase, "5,00", "5,10", "100,00", "101,00", "99,50"].join(";")
    })

    const fullMockCSV = [header, ...rows].join("\n")

    // Test the pure chunkCSV function directly
    const chunks = chunkCSV(fullMockCSV)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => Buffer.byteLength(chunk, "utf8") < 2_000_000)).toBe(true)
  })

  /**
   * -------------------------------
   * CACHE TESTS
   * -------------------------------
   */

  it("should fetch data on first call (cache miss)", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    mockFetch(sampleCSV)

    const result = await getTesouroData()

    expect(result).toBeDefined()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("should reuse cache on subsequent calls (cache hit)", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    mockFetch(sampleCSV)

    await getTesouroData()
    await getTesouroData()

    /**
     * Fetch should be called only once due to cache
     */
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  /**
   * -------------------------------
   * IN-FLIGHT TEST
   * -------------------------------
   */

  it("should reuse in-flight promise for concurrent requests", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    mockFetch(sampleCSV)

    await Promise.all([
      getTesouroData(),
      getTesouroData(),
      getTesouroData(),
    ])

    /**
     * Even with multiple concurrent calls,
     * fetch should be called only once
     */
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  /**
   * -------------------------------
   * findTesouroTitulo TESTS
   * -------------------------------
   */

  it("should return full history for a title", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01"
    )

    expect(result).not.toBeNull()
    expect(result!.items.length).toBeGreaterThan(0)
  })

  it("should apply from filter", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        from: "2026-03-31",
      }
    )

    expect(result).not.toBeNull()

    const allValid = result!.items.every(
      (item) => item.dataBase >= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply to filter", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        to: "2026-03-31",
      }
    )

    expect(result).not.toBeNull()

    const allValid = result!.items.every(
      (item) => item.dataBase <= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply limit correctly", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Tesouro Selic",
      "2028-03-01",
      {
        limit: 1,
      }
    )

    expect(result).not.toBeNull()
    expect(result!.items.length).toBe(1)
  })

  it("should return null when not found", async () => {
    mockFetch(sampleCSV)

    const result = await findTesouroTitulo(
      "Titulo Inexistente",
      "2099-01-01"
    )

    expect(result).toBeNull()
  })
})