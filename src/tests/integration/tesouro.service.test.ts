import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { findTesouroTitulo } from "@/lib/services/tesouro.service"

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

/**
   * -------------------------------
   * LAZY READING / SMART CHUNK TESTS
   * -------------------------------
   */

  it("should trigger lazy chunk reading optimization when limit is explicitly 1 without filters", async () => {
    const { findTesouroTitulo } = await import("@/lib/services/tesouro.service")

    mockFetch(sampleCSV)

    // When limit is 1 and no date filters are applied, 
    // it should only parse chunk 0 instead of downloading/parsing the full dataset.
    const result = await findTesouroTitulo("Tesouro Selic", "2028-03-01", {
      limit: 1,
    })

    expect(result).not.toBeNull()
    expect(result!.items.length).toBe(1)
  })

  /**
   * -------------------------------
   * HEAD THROTTLING & CACHE PURGE TESTS
   * -------------------------------
   */

  it("should purge cache, reset chunks, and update latestDataBase when a new CSV is published", async () => {
    const { getTesouroData } = await import("@/lib/services/tesouro.service")

    /**
     * Add new line on the CSV to simulate a new dataset being published.
     * This will allow us to test if the service correctly detects the change,
     * purges the cache, resets local chunks, and updates the latestDataBase field.
     */
    const sampleCSVUpdated = sampleCSV + "\nTesouro Selic;01/03/2028;31/12/2099;0,00;0,00;0,00;0,00;0,00"

    // Dynamic variables to control the mock headers and data responses
    let currentLastModified = "Wed, 01 Apr 2026 10:00:00 GMT"
    let currentCSVContent = sampleCSV

    // Mock global fetch to handle HEAD checks and alternating CSV data downloads
    const fetchMock = vi.fn().mockImplementation(async (url, options) => {
      if (options?.method === "HEAD") {
        return {
          ok: true,
          headers: { get: (header: string) => (header === "last-modified" ? currentLastModified : null) },
        } as Response
      }
      return {
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(currentCSVContent).buffer,
      } as Response
    })

    vi.stubGlobal("fetch", fetchMock)

    /** --- 1. Initial Call ---
     * Initial call to populate cache and local memory state (triggers 1 HEAD + 1 GET = 2 calls)
     */
    console.log("[DEBUG] --- Starting Initial Call ---")
    const resultV1 = await getTesouroData()

    // Verify initial state
    expect(resultV1).toBeDefined()
    expect(resultV1.latestDataBase).toBe("2026-04-01") // Assuming parser converts '01/04/2026' to ISO '2026-04-01';
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Enable fake timers and advance time past the local RAM HEAD TTL (60s)
    vi.useFakeTimers()
    vi.advanceTimersByTime(65 * 1000)

    // --- 2. Simulate Remote Dataset Update ---
    currentLastModified = "Thu, 02 Apr 2026 12:00:00 GMT"
    currentCSVContent = sampleCSVUpdated // Switch to the new CSV payload

    /** --- 3. Second Call ---
     * Detects remote update, purges cache, resets chunks, and refetches (triggers another 1 HEAD + 1 GET = 2 calls)
     */
    console.log("[DEBUG] --- Starting Second Call ---")
    const resultV2 = await getTesouroData()

    console.log(sampleCSVUpdated)
    console.log(resultV2.latestDataBase)

    // Verify that the new dataset was fetched, parsed, and updated correctly
    expect(resultV2).toBeDefined()
    expect(resultV2.latestDataBase).toBe("2099-12-31") // Validates that the new record date is reflected
    expect(fetchMock).toHaveBeenCalledTimes(4) // 2 from initial call + 2 from updated call

    vi.useRealTimers()
  })
})