/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

import { GET } from "@/app/api/titulo/route"
import { mockFetch } from "../mocks/fetch.mock"

/**
 * Load CSV fixture (real data → full pipeline)
 */
const csvPath = resolve("src/tests/fixtures/tesouro.sample.csv")
const sampleCSV = readFileSync(csvPath, "utf-8")

describe("/api/titulo", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  /**
   * -------------------------------
   * 400 - VALIDATION
   * -------------------------------
   */
  it("should return 400 for invalid params", async () => {
    const req = new Request(
      "http://localhost/api/titulo?tipo=&vencimento=invalid-date"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(400)

    const json = await res.json()

    expect(json.error).toBe("Invalid query parameters")
    expect(Array.isArray(json.details)).toBe(true)
  })

  /**
   * -------------------------------
   * 404 - NOT FOUND
   * -------------------------------
   */
  it("should return 404 when title not found", async () => {
    mockFetch(sampleCSV)

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
   * 200 - SUCCESS
   * -------------------------------
   */
  it("should return title history successfully", async () => {
    mockFetch(sampleCSV)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(json.items).toBeDefined()
    expect(Array.isArray(json.items)).toBe(true)
    expect(json.items.length).toBeGreaterThan(0)

    expect(json.fetchedAt).toBeDefined()
    expect(typeof json.fetchedAt).toBe("string")
  })

  /**
   * -------------------------------
   * FILTERS
   * -------------------------------
   */

  it("should apply from filter", async () => {
    mockFetch(sampleCSV)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&from=2026-03-31"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    const allValid = json.items.every(
      (item: any) => item.dataBase >= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply to filter", async () => {
    mockFetch(sampleCSV)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&to=2026-03-31"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    const allValid = json.items.every(
      (item: any) => item.dataBase <= "2026-03-31"
    )

    expect(allValid).toBe(true)
  })

  it("should apply limit correctly", async () => {
    mockFetch(sampleCSV)

    const req = new Request(
      "http://localhost/api/titulo?tipo=Tesouro Selic&vencimento=2028-03-01&limit=1"
    )

    const res = await GET(req as any)

    expect(res.status).toBe(200)

    const json = await res.json()

    expect(json.items.length).toBe(1)
  })
})