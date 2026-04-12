import { getTesouroData } from "@/lib/services/tesouro.service"
import SearchForm from "@/app/components/search/SearchForm"
import { TesouroTitulo } from "@/lib/types/tesouro.types"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Buscar Títulos",
  description:
    "Busque títulos do Tesouro Direto por tipo e vencimento de forma rápida.",
}

/**
 * Extract unique "tipo" and "vencimento"
 */
function extractOptions(map: Map<string, TesouroTitulo[]>) {
  const tiposSet = new Set<string>()
  const vencimentosByTipo = new Map<string, Set<string>>()

  for (const list of map.values()) {
    if (!list || list.length === 0) continue

    const { tipo, vencimento } = list[0]

    tiposSet.add(tipo)

    if (!vencimentosByTipo.has(tipo)) {
      vencimentosByTipo.set(tipo, new Set())
    }

    vencimentosByTipo.get(tipo)!.add(vencimento)
  }

  /**
   * Convert Set → Array
   */
  const tipos = Array.from(tiposSet).sort()

  const vencimentosMap: Record<string, string[]> = {}

  for (const [tipo, vencimentosSet] of vencimentosByTipo.entries()) {
    vencimentosMap[tipo] = Array.from(vencimentosSet).sort((a, b) =>
      b.localeCompare(a)
    )
  }

  return { tipos, vencimentosMap }
}

export default async function SearchPage() {
  const { map } = await getTesouroData()

  const { tipos, vencimentosMap } = extractOptions(map)

  return (
    <main className="max-w-5xl mx-auto px-4 w-full">
      <div className="max-w-xl mx-auto w-full">
        <h1 className="text-2xl font-semibold text-text-highlight mb-6">
          Buscar Título do Tesouro
        </h1>

        <SearchForm tipos={tipos} vencimentosMap={vencimentosMap} />
      </div>
    </main>
  )
}