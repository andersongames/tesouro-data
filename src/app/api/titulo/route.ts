import { findTesouroTitulo } from "@/lib/services/tesouro.service"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * Schema for validating query params
 */
const querySchema = z.object({
  tipo: z.string().min(1),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    /**
     * Convert URLSearchParams into plain object
     */
    const query = Object.fromEntries(searchParams.entries())

    /**
     * Validate query params using Zod
     */
    const parsed = querySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { tipo, vencimento, from, to, limit } = parsed.data

    /**
     * Call service layer with filters
     */
    const result = await findTesouroTitulo(tipo, vencimento, {
      from,
      to,
      limit,
    })

    if (!result) {
      return NextResponse.json(
        { error: "Title not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    /**
     * Catch unexpected errors (network, parsing, etc.)
     */
    console.error("[/api/titulo] Internal error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}