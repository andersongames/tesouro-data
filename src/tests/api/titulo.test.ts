/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { GET } from "@/app/api/titulo/route"
import { createDatasetMock } from "../mocks/dataset.mock"

/**
 * Initialize and apply the dataset mock based on the CSV fixture.
 */
const setupMockFileSystem = createDatasetMock()

describe("/api/titulo", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  /**
   * -------------------------------
   * METADATA & GRACEFUL DEGRADATION TESTS
   * -------------------------------
   */
  it("should handle graceful degradation when metadata file is missing or corrupted", async () => {
    setupMockFileSystem(false)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01"
    )

    const res = await GET(req as any)

    // Should return 404 gracefully without crashing when dataset files are absent
    expect(res.status).toBe(404)
  })

  /**
   * -------------------------------
   * 400 - VALIDATION
   * -------------------------------
   */
  it("should return 400 for invalid params (zod validation)", async () => {
    const req = new Request(
      "http://localhost/api/titulo?tipo=&vencimento=invalid-date"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(400)

    const json = await res.json()

    expect(json.error).toBe("Invalid query parameters")
    expect(Array.isArray(json.details)).toBe(true)
  })

  it("should return 400 for invalid vencimento format", async () => {
    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2026/01/01"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(400)

    const json = await res.json()

    expect(json.error).toBe("Invalid 'vencimento' format")
  })

  it("should return 400 for invalid BR vencimento (invalid date)", async () => {
    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=31-02-2026"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(400)
  })

  it("should return 400 for invalid from/to formats", async () => {
    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&from=invalid&to=01-01-2026"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(400)

    const json = await res.json()

    expect(json.error).toBe("Invalid date range")
  })

  /**
   * -------------------------------
   * 404 - NOT FOUND
   * -------------------------------
   */
  it("should return 404 when title not found", async () => {
    setupMockFileSystem(false)

    const req = new Request(
      "http://localhost/api/titulo?tipo=TituloInexistente&vencimento=2099-01-01"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(404)

    const json = await res.json()

    expect(json.error).toBe("Title not found")
  })

  /**
   * -------------------------------
   * 200 - SUCCESS (ISO)
   * -------------------------------
   */
  it("should return title history successfully (ISO date)", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(Array.isArray(json.items)).toBe(true)
    expect(json.items.length).toBeGreaterThan(0)
  })

  /**
   * -------------------------------
   * 200 - SUCCESS (BR FORMAT)
   * -------------------------------
   */
  it("should accept BR date format (DD-MM-YYYY)", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=01-03-2028"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(Array.isArray(json.items)).toBe(true)
    expect(json.items.length).toBeGreaterThan(0)
  })

  it("should return same result for ISO and BR formats", async () => {
    setupMockFileSystem(true)

    const isoReq = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01"
    )

    const brReq = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=01-03-2028"
    )

    const isoRes = await GET(isoReq as any)
    const brRes = await GET(brReq as any)

    const isoJson = await isoRes.json()
    const brJson = await brRes.json()

    expect(isoRes.status).toBe(200)
    expect(brRes.status).toBe(200)

    /**
     * Compare normalized results
     * Ensures normalization layer is working correctly
     */
    expect(brJson.items).toEqual(isoJson.items)
  })

  /**
   * -------------------------------
   * FILTERS
   * -------------------------------
   */

  it("should apply from filter (ISO)", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&from=2026-03-31"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const allValid = json.items.every(
      (item: any) => item.dataBase >= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply from filter (BR format)", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&from=31-03-2026"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const allValid = json.items.every(
      (item: any) => item.dataBase >= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply to filter (BR format)", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&to=31-03-2026"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const allValid = json.items.every(
      (item: any) => item.dataBase <= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply limit correctly", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&limit=1"
    )

    const res = await GET(req as any)

    const json = await res.json()

    expect(json.items.length).toBe(1)
  })
})