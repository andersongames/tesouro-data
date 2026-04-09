/**
 * Normalizes a string into a URL-friendly slug
 *
 * Example:
 * "Tesouro Selic" -> "tesouro-selic"
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD") // separates accents
    .replace(/[\u0300-\u036f]/g, "") // removes accents
    .replace(/\s+/g, "-") // spaces to hyphens
}

/**
 * Builds a unique key for a Tesouro title
 *
 * This key is used for O(1) lookups in a Map
 */
export function normalizeTituloKey(
  tipo: string,
  vencimentoISO: string
): string {
  const tipoSlug = slugify(tipo)

  return `${tipoSlug}|${vencimentoISO}`
}