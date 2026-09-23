import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { chunkCSV, findTesouroTitulo } from "@/lib/services/tesouro.service"

import { mockFetch } from "../mocks/fetch.mock"
import { TESOURO_CSV_URL } from "@/lib/constants"

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
   * HEAVY CONCURRENT REQUESTS TEST (Cache Stampede / Rain of Requests)
   * -------------------------------
   */

  it("should handle a heavy rain of simultaneous requests and trigger fetch only once", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    // Mock fetch with a slight artificial delay to simulate network latency
    // and force race conditions among concurrent callers.
    const slowMockCSV = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return {
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(sampleCSV).buffer,
      } as Response
    }

    vi.stubGlobal("fetch", vi.fn().mockImplementation(slowMockCSV))

    // Trigger a heavy rain of 20 simultaneous requests
    const concurrentRequests = Array.from({ length: 20 }, () => getTesouroData())

    const results = await Promise.all(concurrentRequests)

    // Ensure all requests resolved successfully
    expect(results.length).toBe(20)
    results.forEach((result) => {
      expect(result).toBeDefined()
      expect(result.data.length).toBeGreaterThan(0)
    })

    /**
     * Even under a heavy load of 20 concurrent requests,
     * the external fetch must be executed exactly once due to request coalescing/cache.
     * Total fetch calls must be 2 (1 HEAD for validation + 1 GET for download)
     */
    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Identifies and validates each call individually by HTTP method
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls

    // The first call must be the validation HEAD request
    const [headUrl, headOptions] = fetchCalls[0]
    expect(headUrl).toBe(TESOURO_CSV_URL)
    expect(headOptions).toMatchObject({ method: "HEAD" })

    // The second call must be the GET request for the complete CSV
    const [getUrl, getOptions] = fetchCalls[1]
    expect(getUrl).toBe(TESOURO_CSV_URL)
    expect(getOptions).toMatchObject({ cache: "no-store" })
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
    
    // Total fetch calls must be 2 (1 HEAD for validation + 1 GET for download)
    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Identifies and validates each call individually by HTTP method
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls

    // The first call must be the validation HEAD request
    const [headUrl, headOptions] = fetchCalls[0]
    expect(headUrl).toBe(TESOURO_CSV_URL)
    expect(headOptions).toMatchObject({ method: "HEAD" })

    // The second call must be the GET request for the complete CSV
    const [getUrl, getOptions] = fetchCalls[1]
    expect(getUrl).toBe(TESOURO_CSV_URL)
    expect(getOptions).toMatchObject({ cache: "no-store" })
  })

it("should reuse RAM cache on subsequent calls (local-first cache hit)", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    mockFetch(sampleCSV)

    await getTesouroData()
    await getTesouroData()

    // Total fetch calls must be 2: 
    // 1 HEAD for the initial validation + 1 GET for the initial download.
    // Subsequent calls are served directly from RAM via Local First, making 0 network calls.
    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Identifies and validates each call individually by HTTP method
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls

    // The first call must be the validation HEAD request
    const [headUrl, headOptions] = fetchCalls[0]
    expect(headUrl).toBe(TESOURO_CSV_URL)
    expect(headOptions).toMatchObject({ method: "HEAD" })

    // The second call must be the GET request for the complete CSV
    const [getUrl, getOptions] = fetchCalls[1]
    expect(getUrl).toBe(TESOURO_CSV_URL)
    expect(getOptions).toMatchObject({ cache: "no-store" })
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
     * Total fetch calls must be 2 (1 HEAD for validation + 1 GET for download)
     */
    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Identifies and validates each call individually by HTTP method
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls

    // The first call must be the validation HEAD request
    const [headUrl, headOptions] = fetchCalls[0]
    expect(headUrl).toBe(TESOURO_CSV_URL)
    expect(headOptions).toMatchObject({ method: "HEAD" })

    // The second call must be the GET request for the complete CSV
    const [getUrl, getOptions] = fetchCalls[1]
    expect(getUrl).toBe(TESOURO_CSV_URL)
    expect(getOptions).toMatchObject({ cache: "no-store" })
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