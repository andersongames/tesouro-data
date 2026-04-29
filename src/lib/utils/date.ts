/**
  Validates if the provided year, month, and day form a real calendar date.

  Performs:
    Basic range checks (month: 1–12, day: 1–31)
    Strict validation using native Date to catch invalid dates
    (e.g., 30/02/2029 will be rejected)

  Useful for:
    Ensuring parsed dates are valid before formatting or normalization
    Reuse across different date parsers (ISO, BR, etc.)

  Returns:
    true if the date is valid
    false otherwise
*/
export function isValidDateParts(
  year: number,
  month: number,
  day: number
): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  /**
    Optional: stronger validation using native Date
    Ensures real calendar validity (e.g., Feb 30 invalid)
  */
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/**
 * Converts ISO date (YYYY-MM-DD) to BR format (DD/MM/YYYY)
 */
export function formatDateBR(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) return iso
  const [, year, month, day] = match

  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)

  if (!isValidDateParts(yearNum, monthNum, dayNum)) return iso

  return `${day}/${month}/${year}`
}

/**
 * Converts BR date, using hyphen, (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
 *
 * Returns null if the format is invalid
 */
export function parseDateBRToISO(br: string): string | null {
  /*
    Matches BR format using hyphen: DD-MM-YYYY
    Example: 01-01-2029
  */
  const match = br.match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (!match) return null

  const [, day, month, year] = match

  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)

  if (!isValidDateParts(yearNum, monthNum, dayNum)) return null

  return `${year}-${month}-${day}`
}

/**
 * Normalizes a date string to ISO format
 *
 * Supports:
 * - ISO (YYYY-MM-DD)
 * - BR  (DD/MM/YYYY)
 *
 * Returns:
 * - ISO string if valid
 * - null if invalid format
 */
export function normalizeToISODate(input: string): string | null {
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }

  // BR format
  const brToISO = parseDateBRToISO(input)
  if (brToISO) return brToISO

  return null
}