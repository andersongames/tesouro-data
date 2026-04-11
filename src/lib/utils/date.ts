/**
 * Converts ISO date (YYYY-MM-DD) to BR format (DD/MM/YYYY)
 */
export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}