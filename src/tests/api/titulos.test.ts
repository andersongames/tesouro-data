/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { GET } from "@/app/api/titulos/route"
import { mockFetch } from "../mocks/fetch.mock"

/**
 * Load CSV fixture
 */
const csvPath = resolve("src/tests/fixtures/tesouro.sample.csv")
const sampleCSV = readFileSync(csvPath, "utf-8")

describe("/api/titulos", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  /**
   * -------------------------------
   * DEFAULT BEHAVIOR
   * -------------------------------
   */
  it("should return all titles by default", async () => {
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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
    mockFetch(sampleCSV)

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