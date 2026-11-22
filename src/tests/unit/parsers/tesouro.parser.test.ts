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

  // TESTS TO ADD:

  /** Teste de Particionamento por Ano:
   * Validar se uma função de agrupamento ou salvamento
   * por ano separa corretamente os registros com base no
   * ano de vencimento extraído (vencimento).
   */

  /** Teste de Serialização/Deserialização do Map para JSON:
   * Garantir que a conversão de um Map de títulos para um array
   * de entradas ([key, value][]) e vice-versa ocorre sem perda de dados.
   */

  /** Teste de Geração de Metadados:
   * Validar se o objeto de metadados (metadata.json) calcula
   * corretamente a data mais recente (latestDataBase) a partir
   * de um conjunto de dados de entrada.
   */

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

  describe("Map Serialization / Deserialization", () => {
    it("should serialize a Map to JSON entries array and deserialize it back without data loss", () => {
      const mockData = [
        {
          tipo: "Tesouro Selic",
          vencimento: "2028-03-01",
          dataBase: "2026-03-31",
          taxaCompra: 0.01,
          taxaVenda: 0.02,
          puCompra: 18707.93,
          puVenda: 18694.15,
          puBase: 18694.15,
        },
      ]

      const originalMap = buildTituloMap(mockData)

      // Serialize Map to entries array and convert to JSON string (simulating file write)
      const entriesArray = Array.from(originalMap.entries())
      const jsonString = JSON.stringify(entriesArray)

      // Deserialize JSON string back to entries and reconstruct the Map (simulating file read)
      const parsedEntries = JSON.parse(jsonString) as [string, unknown][]
      const reconstructedMap = new Map(parsedEntries)

      expect(reconstructedMap.size).toBe(originalMap.size)

      for (const [key, value] of originalMap.entries()) {
        expect(reconstructedMap.has(key)).toBe(true)
        expect(reconstructedMap.get(key)).toEqual(value)
      }
    })
  })
})
