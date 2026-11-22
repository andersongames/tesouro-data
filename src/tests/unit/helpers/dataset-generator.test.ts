import { describe, it, expect, beforeEach, vi } from "vitest"
import { TesouroTitulo } from "@/lib/types/tesouro.types"
import { getLatestDataBase, partitionMapByMaturityYear } from "../../../../scripts/helpers/dataset-generator.helper"

describe("dataset-generator helper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getLatestDataBase", () => {
    it("should return null for an empty dataset", () => {
      const result = getLatestDataBase([])
      expect(result).toBeNull()
    })

    it("should correctly identify the most recent dataBase date from entries", () => {
      const mockData: TesouroTitulo[] = [
        {
          tipo: "Tesouro Selic",
          vencimento: "2028-03-01",
          dataBase: "2026-03-01",
          taxaCompra: 0.01,
          taxaVenda: 0.02,
          puCompra: 1000,
          puVenda: 1000,
          puBase: 1000,
        },
        {
          tipo: "Tesouro Selic",
          vencimento: "2028-03-01",
          dataBase: "2026-03-31", // Most recent
          taxaCompra: 0.01,
          taxaVenda: 0.02,
          puCompra: 1000,
          puVenda: 1000,
          puBase: 1000,
        },
        {
          tipo: "Tesouro IPCA+",
          vencimento: "2032-08-15",
          dataBase: "2026-03-15",
          taxaCompra: 6,
          taxaVenda: 6,
          puCompra: 1000,
          puVenda: 1000,
          puBase: 1000,
        },
      ]

      const result = getLatestDataBase(mockData)
      expect(result).toBe("2026-03-31")
    })
  })

  describe("partitionMapByMaturityYear", () => {
    it("should partition a title map correctly by maturity year (YYYY)", () => {
      const tituloMap = new Map<string, TesouroTitulo[]>()

      const title2028: TesouroTitulo = {
        tipo: "Tesouro Selic",
        vencimento: "2028-03-01",
        dataBase: "2026-03-31",
        taxaCompra: 0.01,
        taxaVenda: 0.02,
        puCompra: 1000,
        puVenda: 1000,
        puBase: 1000,
      }

      const title2032: TesouroTitulo = {
        tipo: "Tesouro IPCA+",
        vencimento: "2032-08-15",
        dataBase: "2026-03-31",
        taxaCompra: 6,
        taxaVenda: 6,
        puCompra: 1000,
        puVenda: 1000,
        puBase: 1000,
      }

      tituloMap.set("tesouro-selic|2028-03-01", [title2028])
      tituloMap.set("tesouro-ipca+|2032-08-15", [title2032])

      const partitioned = partitionMapByMaturityYear(tituloMap)

      // Should have two year partitions: "2028" and "2032"
      expect(partitioned.size).toBe(2)
      expect(partitioned.has("2028")).toBe(true)
      expect(partitioned.has("2032")).toBe(true)

      const year2028Map = partitioned.get("2028")!
      expect(year2028Map.size).toBe(1)
      expect(year2028Map.has("tesouro-selic|2028-03-01")).toBe(true)

      const year2032Map = partitioned.get("2032")!
      expect(year2032Map.size).toBe(1)
      expect(year2032Map.has("tesouro-ipca+|2032-08-15")).toBe(true)
    })
  })
})