import { TesouroCSVRow, TesouroTitulo } from "../types/tesouro.types"

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