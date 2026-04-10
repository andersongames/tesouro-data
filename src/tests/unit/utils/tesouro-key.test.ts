import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { normalizeTituloKey } from "@/lib/utils/tesouro-key"
import { parseTesouroCSV } from "@/lib/parsers/tesouro.parser"
import { resolve } from "path"

/**
 * Load CSV fixture
 */
const csvPath = resolve(__dirname, "../../fixtures/tesouro.sample.csv")
const sampleCSV = readFileSync(csvPath, "utf-8")

describe("normalizeTituloKey", () => {
  it("should normalize title and vencimento into consistent key", () => {
    const key = normalizeTituloKey(
      "Tesouro Prefixado",
      "2029-01-01"
    )

    expect(key).toBe("tesouro-prefixado|2029-01-01")
  })

  it("should ignore casing differences", () => {
    const key1 = normalizeTituloKey(
      "TESOURO PREFIXADO",
      "2029-01-01"
    )

    const key2 = normalizeTituloKey(
      "tesouro prefixado",
      "2029-01-01"
    )

    expect(key1).toBe(key2)
  })

  it("should normalize extra spaces", () => {
    const key1 = normalizeTituloKey(
      "Tesouro   Prefixado",
      "2029-01-01"
    )

    const key2 = normalizeTituloKey(
      "Tesouro Prefixado",
      "2029-01-01"
    )

    expect(key1).toBe(key2)
  })

  it("should NOT remove special characters like '+'", () => {
    const key = normalizeTituloKey(
      "Tesouro IPCA+",
      "2032-08-15"
    )

    expect(key).toContain("ipca+")
  })

  it("should generate consistent keys for real CSV data", () => {
    const parsed = parseTesouroCSV(sampleCSV)

    const item = parsed[0]

    const key = normalizeTituloKey(
      item.tipo,
      item.vencimento
    )

    /**
     * Expect format:
     * slug|YYYY-MM-DD
     */
    expect(key).toMatch(/^[a-z0-9+|-]+\|\d{4}-\d{2}-\d{2}$/)
  })
})