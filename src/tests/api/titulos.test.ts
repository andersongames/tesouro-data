/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { GET } from "@/app/api/titulos/route"
import { createDatasetMock } from "../mocks/dataset.mock"

/**
 * Initialize and apply the dataset mock based on the CSV fixture using spies.
 */
const setupMockFileSystem = createDatasetMock()

describe("/api/titulos", () => {
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
  it("should include correct metadata fields in the response", async () => {
    setupMockFileSystem(true)

    const req = new Request("http://localhost/api/titulos")
    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(json).toHaveProperty("lastUpdatedAt")
    expect(json).toHaveProperty("latestDataBase")
    expect(json).toHaveProperty("dataSource")

    expect(typeof json.lastUpdatedAt).toBe("string")
    expect(json.latestDataBase).toBe("2026-03-31")
    expect(json.dataSource).toBe("local")
  })

  it("should handle graceful degradation when dataset files are missing", async () => {
    setupMockFileSystem(false)

    const req = new Request("http://localhost/api/titulos")
    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    // Should return empty items safely without throwing errors
    expect(json.items).toEqual([])
  })

  /**
   * -------------------------------
   * DEFAULT BEHAVIOR
   * -------------------------------
   */
it("should return all titles by default", async () => {
    setupMockFileSystem(true)

    const req = new Request("http://localhost/api/titulos")

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(json.items).toBeDefined()
    expect(Array.isArray(json.items)).toBe(true)
    expect(json.items.length).toBeGreaterThan(0)

    expect(json.maturity).toBe("all")
    expect(json.grouped).toBe(false)
  })

  /**
   * -------------------------------
   * MATURITY FILTERS
   * -------------------------------
   */
  it("should filter future titles", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulos?maturity=future"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const today = new Date().toISOString().slice(0, 10)

    const allValid = json.items.every(
      (item: any) => item.vencimento >= today
    )

    expect(allValid).toBe(true)
  })

  it("should filter expired titles", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulos?maturity=expired"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const today = new Date().toISOString().slice(0, 10)

    const allValid = json.items.every(
      (item: any) => item.vencimento < today
    )

    expect(allValid).toBe(true)
  })

  /**
   * -------------------------------
   * GROUPED MODE
   * -------------------------------
   */
  it("should return grouped response", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulos?grouped=true"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(json.grouped).toBe(true)
    expect(Array.isArray(json.items)).toBe(true)

    const group = json.items[0]

    expect(group).toHaveProperty("tipo")
    expect(group).toHaveProperty("vencimento")
    expect(Array.isArray(group.items)).toBe(true)
  })

  it("should remove redundant fields in grouped mode", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulos?grouped=true"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const group = json.items[0]
    const item = group.items[0]

    /**
     * Children should NOT contain tipo and vencimento
     */
    expect(item.tipo).toBeUndefined()
    expect(item.vencimento).toBeUndefined()

    /**
     * Should contain only expected fields
     */
    expect(item).toMatchObject({
      dataBase: expect.any(String),
      taxaCompra: expect.any(Number),
      taxaVenda: expect.any(Number),
      puCompra: expect.any(Number),
      puVenda: expect.any(Number),
      puBase: expect.any(Number),
    })
  })

  /**
   * -------------------------------
   * GROUPED + MATURITY
   * -------------------------------
   */
  it("should apply maturity filter in grouped mode", async () => {
    setupMockFileSystem(true)

    const req = new Request(
      "http://localhost/api/titulos?grouped=true&maturity=future"
    )

    const res = await GET(req as any)

    const json = await res.json()

    const today = new Date().toISOString().slice(0, 10)

    const allValid = json.items.every(
      (group: any) => group.vencimento >= today
    )

    expect(allValid).toBe(true)
  })
})