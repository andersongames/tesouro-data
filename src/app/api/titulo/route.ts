import { findTesouroTitulo } from "@/lib/services/tesouro.service"
import { normalizeToISODate } from "@/lib/utils/date"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * Schema for validating query params
 *
 * NOTE:
 * - Date format validation is handled separately using normalizeToISODate
 * - Zod only ensures correct types and presence
 */
const querySchema = z.object({
  tipo: z.string().min(1),
  vencimento: z.string().min(1), // ISO date
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
     * Normalize date inputs to ISO format
     *
     * Supports:
     * - ISO (YYYY-MM-DD)
     * - BR  (DD-MM-YYYY)
     */
    const normalizedVencimento = normalizeToISODate(vencimento)

    if (!normalizedVencimento) {
      return NextResponse.json(
        {
          error: "Invalid 'vencimento' format",
          message:
            "Expected YYYY-MM-DD or DD-MM-YYYY",
        },
        { status: 400 }
      )
    }

    /**
     * Optional filters normalization
     */
    const parsedFrom = from ? normalizeToISODate(from) : null
    const normalizedFrom = parsedFrom ?? undefined

    const parsedTo = to ? normalizeToISODate(to) : null
    const normalizedTo = parsedTo ?? undefined

    if ((from && !normalizedFrom) || (to && !normalizedTo)) {
      return NextResponse.json(
        {
          error: "Invalid date range",
          message:
            "'from' and 'to' must be in YYYY-MM-DD or DD-MM-YYYY format",
        },
        { status: 400 }
      )
    }

    /**
     * Call service layer with normalized ISO dates and filters
     */
    const result = await findTesouroTitulo(tipo, normalizedVencimento, {
      from: normalizedFrom,
      to: normalizedTo,
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