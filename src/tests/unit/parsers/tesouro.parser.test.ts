import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { buildTituloMap, chunkCSV, parseAndMapChunks, parseTesouroCSV } from "@/lib/parsers/tesouro.parser"
import { normalizeTituloKey } from "@/lib/utils/tesouro-key"

/**
 * Load CSV fixture
 */
const csvPath = resolve(
  __dirname,
  "../../fixtures/tesouro.sample.csv"
)

const sampleCSV = readFileSync(csvPath, "utf-8")

describe("tesouro.parser", () => {
  describe("chunkCSV", () => {
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
  })

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

  describe("buildTituloMap", () => {
    const mockData = [
      {
        tipo: "Tesouro IPCA+",
        vencimento: "2032-08-15",
        dataBase: "2026-03-30",
        taxaCompra: 6,
        taxaVenda: 6,
        puCompra: 1000,
        puVenda: 1000,
        puBase: 1000,
      },
      {
        tipo: "Tesouro IPCA+",
        vencimento: "2032-08-15",
        dataBase: "2026-03-31", // more recent
        taxaCompra: 7,
        taxaVenda: 7,
        puCompra: 1100,
        puVenda: 1100,
        puBase: 1100,
      },
      {
        tipo: "Tesouro Selic",
        vencimento: "2028-03-01",
        dataBase: "2026-03-31",
        taxaCompra: 0.1,
        taxaVenda: 0.1,
        puCompra: 20000,
        puVenda: 20000,
        puBase: 20000,
      },
    ]

    it("should group titles by tipo + vencimento", () => {
      const map = buildTituloMap(mockData)

      /**
       * Expect 2 groups:
       * - Tesouro IPCA+
       * - Tesouro Selic
       */
      expect(map.size).toBe(2)

      const ipcaKey = normalizeTituloKey(
        "Tesouro IPCA+",
        "2032-08-15"
      )

      const ipcaList = map.get(ipcaKey)

      expect(ipcaList).toBeDefined()
      expect(ipcaList!.length).toBe(2)
    })

    it("should sort items by dataBase descending", () => {
      const map = buildTituloMap(mockData)

      const key = normalizeTituloKey(
        "Tesouro IPCA+",
        "2032-08-15"
      )

      const list = map.get(key)!

      /**
       * Most recent item should be first
       */
      expect(list[0].dataBase).toBe("2026-03-31")
      expect(list[1].dataBase).toBe("2026-03-30")
    })

    it("should handle single item groups", () => {
      const single = [mockData[2]]

      const map = buildTituloMap(single)

      expect(map.size).toBe(1)
    })

    it("should not mix different titles", () => {
      const map = buildTituloMap(mockData)

      const selicKey = normalizeTituloKey(
        "Tesouro Selic",
        "2028-03-01"
      )

      const list = map.get(selicKey)!

      expect(list.length).toBe(1)
      expect(list[0].tipo).toBe("Tesouro Selic")
    })
  })

  describe("parseAndMapChunks", () => {
    it("should join multiple chunks, parse them, and return both data array and map", () => {
      const chunk1 = "Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha\nTesouro Selic;01/03/2028;31/03/2026;5,00;5,10;100,00;101,00;99,50"
      const chunk2 = "Tesouro IPCA+;15/08/2032;31/03/2026;6,00;6,10;1000,00;1010,00;995,00"

      const result = parseAndMapChunks([chunk1, chunk2])

      // Verify data parsing
      expect(result.data.length).toBe(2)
      expect(result.data[0].tipo).toBe("Tesouro Selic")
      expect(result.data[1].tipo).toBe("Tesouro IPCA+")

      // Verify map creation
      expect(result.map).toBeInstanceOf(Map)
      expect(result.map.size).toBe(2)
    })

    it("should handle an empty array of chunks gracefully", () => {
      const result = parseAndMapChunks([])

      expect(result.data).toEqual([])
      expect(result.map.size).toBe(0)
    })
  })
})
