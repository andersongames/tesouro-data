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
 * Extracts unique bond types and sorted maturity dates from the dataset map.
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

  const tipos = Array.from(tiposSet).sort()
  const vencimentosMap: Record<string, string[]> = {}

  for (const [tipo, vencimentosSet] of vencimentosByTipo.entries()) {
    vencimentosMap[tipo] = Array.from(vencimentosSet).sort((a, b) =>
      b.localeCompare(a)
    )
  }

  return { tipos, vencimentosMap }
}

/**
 * Search page component without outer card wrapper, utilizing design tokens.
 */
export default async function SearchPage() {
  const { map, lastUpdatedAt } = await getTesouroData()
  const { tipos, vencimentosMap } = extractOptions(map)

  return (
    <main className="max-w-xl mx-auto px-4 py-12 w-full flex-1 flex flex-col justify-center">
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-highlight">
          Buscar Título do Tesouro
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Selecione o tipo e o vencimento para consultar taxas e preços.
        </p>
      </div>

      <SearchForm tipos={tipos} vencimentosMap={vencimentosMap} />

      <div className="mt-6 pt-4 border-t border-border text-center">
        <p className="text-sm text-text-secondary">
          Última atualização: {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
        </p>
      </div>
    </main>
  )
}