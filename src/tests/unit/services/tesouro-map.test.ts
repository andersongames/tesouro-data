import { normalizeTituloKey } from "@/lib/utils/tesouro-key"
import { buildTituloMap } from "@/lib/services/tesouro.service"
import { describe, it, expect } from "vitest"

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
