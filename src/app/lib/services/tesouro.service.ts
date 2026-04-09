import { parseTesouroCSV } from "../parsers/tesouro.parser"
import { TesouroTitulo } from "../types/tesouro.types"

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv"

/**
 * Fetches the Tesouro Direto CSV file.
 *
 * Uses Next.js fetch caching with revalidation to avoid
 * downloading the file on every request.
 */
export async function fetchTesouroCSV(): Promise<string> {
  const response = await fetch(TESOURO_CSV_URL, {
    // Revalidate every 1 hour
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Tesouro CSV: ${response.status}`)
  }

  /**
   * Important:
   * Some government CSV files may use latin1 encoding.
   * We convert the response into ArrayBuffer and decode manually.
   */
  const buffer = await response.arrayBuffer()

  const decoder = new TextDecoder("latin1")
  const csvText = decoder.decode(buffer)

  return csvText
}

/**
 * Fetches and parses Tesouro Direto data into structured objects
 */
export async function getTesouroData(): Promise<TesouroTitulo[]> {
  const csv = await fetchTesouroCSV()

  const parsed = parseTesouroCSV(csv)

  return parsed
}