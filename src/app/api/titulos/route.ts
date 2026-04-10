import { getTesouroData } from "@/lib/services/tesouro.service"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * Schema for validating query params
 */
const querySchema = z.object({
  maturity: z.enum(["future", "expired", "all"]).optional(),
  grouped: z.coerce.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = Object.fromEntries(searchParams.entries())

    const parsed = querySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    /**
     * Default values
     */
    const maturity = parsed.data.maturity ?? "all"
    const grouped = parsed.data.grouped ?? false

    const { map, fetchedAt } = await getTesouroData()

    const today = new Date().toISOString().slice(0, 10)

    /**
     * -------------------------------
     * GROUPED RESPONSE
     * -------------------------------
     */
    if (grouped) {
      const groupedItems = []

      for (const list of map.values()) {
        if (!list || list.length === 0) continue

        /**
         * All items in the list share the same tipo and vencimento
         */
        const { tipo, vencimento } = list[0]

        /**
         * Apply maturity filter at group level
         */
        if (maturity === "future" && vencimento < today) continue
        if (maturity === "expired" && vencimento >= today) continue

        /**
         * Remove redundant fields from children
         */
        const items = list.map((item) => ({
          dataBase: item.dataBase,
          taxaCompra: item.taxaCompra,
          taxaVenda: item.taxaVenda,
          puCompra: item.puCompra,
          puVenda: item.puVenda,
          puBase: item.puBase,
        }))

        groupedItems.push({
          tipo,
          vencimento,
          items,
        })
      }

      return NextResponse.json({
        items: groupedItems,
        total: groupedItems.length,
        fetchedAt,
        maturity,
        grouped: true,
      })
    }

    /**
     * -------------------------------
     * FLAT RESPONSE (default)
     * -------------------------------
     */

    let allTitles = Array.from(map.values()).flat()

    if (maturity === "future") {
      allTitles = allTitles.filter(
        (titulo) => titulo.vencimento >= today
      )
    }

    if (maturity === "expired") {
      allTitles = allTitles.filter(
        (titulo) => titulo.vencimento < today
      )
    }

    return NextResponse.json({
      items: allTitles,
      total: allTitles.length,
      fetchedAt,
      maturity,
      grouped: false,
    })
  } catch (error) {
    console.error("[/api/titulos] Internal error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}