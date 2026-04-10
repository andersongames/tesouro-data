import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { parseTesouroCSV } from "@/lib/parsers/tesouro.parser"

/**
 * Load CSV fixture
 */
const csvPath = resolve(
  __dirname,
  "../../fixtures/tesouro.sample.csv"
)

const sampleCSV = readFileSync(csvPath, "utf-8")

describe("parseTesouroCSV", () => {
  it("should parse CSV into structured objects", () => {
    const result = parseTesouroCSV(sampleCSV)

    expect(result.length).toBeGreaterThan(0)
  })

  it("should convert numeric fields correctly", () => {
    const result = parseTesouroCSV(sampleCSV)

    const item = result[0]

    expect(typeof item.taxaCompra).toBe("number")
    expect(typeof item.puCompra).toBe("number")
  })

  it("should normalize dates to ISO format", () => {
    const result = parseTesouroCSV(sampleCSV)

    const item = result[0]

    expect(item.vencimento).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(item.dataBase).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("should not ignore invalid rows", () => {
    const invalidCSV = `
      Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
      Tesouro IPCA+;INVALID_DATE;30/03/2026;7,03;7,15;896,82;872,37;872,37
      `.trim()

    const result = parseTesouroCSV(invalidCSV)

    expect(result.length).toBeGreaterThan(0)
  })
})