import { TesouroCSVRow, TesouroTitulo } from "../types/tesouro.types"
import { normalizeTituloKey } from "../utils/tesouro-key"

// Maximum lines per chunk to keep each cached payload safely under Next.js' ~2MB limit.
const MAX_LINES_PER_CHUNK = 19_173

/**
 * Pure function that splits a raw CSV string into an array of text chunks.
 * Keeps each chunk safely under the ~2MB cache size limit.
 */
export function chunkCSV(csv: string, maxLinesPerChunk: number = MAX_LINES_PER_CHUNK): string[] {
  const lines = csv.split(/\r?\n/)
  const chunks: string[] = []

  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    const chunkLines = lines.slice(i, i + maxLinesPerChunk)
    const chunk = chunkLines.join("\n")

    if (chunk.length > 0) {
      chunks.push(chunk)
    }
  }

  return chunks
}

/**
 * Converts a Brazilian formatted number (e.g. "13,66") into a float (13.66)
 */
function parseBRNumber(value: string): number {
  if (!value) return 0

  return Number(value.replace(",", "."))
}

/**
 * Converts a date from DD/MM/YYYY to ISO format (YYYY-MM-DD)
 */
function parseBRDateToISO(date: string): string {
  const [day, month, year] = date.split("/")

  return `${year}-${month}-${day}`
}

/**
 * Parses raw CSV text into structured TesouroTitulo objects
 */
export function parseTesouroCSV(csv: string): TesouroTitulo[] {
  const lines = csv.split("\n").map((line) => line.trim())

  // First line contains headers
  const headers = lines[0].split(";")

  const dataLines = lines.slice(1)

  const result: TesouroTitulo[] = []

  for (const line of dataLines) {
    if (!line) continue

    const values = line.split(";")

    // Skip malformed rows
    if (values.length !== headers.length) continue

    /**
     * Build a raw object using header mapping
     */
    const row: TesouroCSVRow = headers.reduce((acc, header, index) => {
      acc[header as keyof TesouroCSVRow] = values[index]
      return acc
    }, {} as TesouroCSVRow)

    /**
     * Normalize into strongly typed object
     */
    const titulo: TesouroTitulo = {
      tipo: row["Tipo Titulo"],
      vencimento: parseBRDateToISO(row["Data Vencimento"]),
      dataBase: parseBRDateToISO(row["Data Base"]),
      taxaCompra: parseBRNumber(row["Taxa Compra Manha"]),
      taxaVenda: parseBRNumber(row["Taxa Venda Manha"]),
      puCompra: parseBRNumber(row["PU Compra Manha"]),
      puVenda: parseBRNumber(row["PU Venda Manha"]),
      puBase: parseBRNumber(row["PU Base Manha"]),
    }

    result.push(titulo)
  }

  return result
}

/**
 * Builds a Map for O(1) lookup where each key contains
 * a list of historical entries for the same title
 *
 * Key format:
 *   tipoSlug|vencimentoISO
 *
 * Value:
 *   Array of TesouroTitulo sorted by dataBase DESC (most recent first)
 */
export function buildTituloMap(
  data: TesouroTitulo[]
): Map<string, TesouroTitulo[]> {
  const map = new Map<string, TesouroTitulo[]>()

  for (const titulo of data) {
    const key = normalizeTituloKey(titulo.tipo, titulo.vencimento)

    /**
     * If the key does not exist yet, initialize with empty array
     */
    if (!map.has(key)) {
      map.set(key, [])
    }

    /**
     * Push the current record into the list
     */
    map.get(key)!.push(titulo)
  }

  /**
   * Sort each list by dataBase DESC (most recent first)
   *
   * This ensures that:
   * - index 0 is always the latest data
   * - faster access for default queries
   */
  for (const list of map.values()) {
    list.sort((a, b) => {
      // Compare ISO dates (string comparison works correctly here)
      return b.dataBase.localeCompare(a.dataBase)
    })
  }

  return map
}

/**
 * Pure function that joins raw chunk strings, parses the CSV content,
 * and builds the corresponding title mapping dictionary.
 */
export function parseAndMapChunks(chunks: string[]): { 
  data: TesouroTitulo[]
  map: Map<string, TesouroTitulo[]> 
} {
  const fullCsvString = chunks.join("\n")
  const data = parseTesouroCSV(fullCsvString)
  const map = buildTituloMap(data)
  
  return { data, map }
}