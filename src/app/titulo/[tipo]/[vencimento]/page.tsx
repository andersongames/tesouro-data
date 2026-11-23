import { findTesouroTitulo } from "@/lib/services/tesouro.service"
import { notFound } from "next/navigation"
import { formatDateBR, normalizeToISODate } from "@/lib/utils/date"
import Link from "next/link"
import { Metadata } from "next"

/**
 * Page params type
 */
type Props = {
  params: Promise<{
    tipo: string
    vencimento: string
  }>
  searchParams: Promise<{
    history?: string
  }>
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { tipo, vencimento } = await params
  const decodedTipo = decodeURIComponent(tipo)

  return {
    title: `${decodedTipo} (${vencimento})`,
    description: `Dados atualizados do ${decodedTipo} com vencimento em ${vencimento}, incluindo taxas e preços.`,
  }
}

export const dynamic = "force-dynamic"

/**
 * SSR result page optimized for scraping (clean raw values inside stable IDs) and improved visual readability.
 */
export default async function TituloPage({
  params,
  searchParams,
}: Props) {
  const { tipo, vencimento } = await params
  const { history } = await searchParams

  const decodedTipo = decodeURIComponent(tipo)
  const showHistory = history === "true"

  /**
   * Normalize date input:
   * - Accepts ISO (YYYY-MM-DD)
   * - Accepts BR (DD-MM-YYYY)
   */
  const vencimentoISO = normalizeToISODate(vencimento)

  /**
   * If date format is invalid, return 404
   */
  if (!vencimentoISO) {
    return notFound()
  }

  const result = await findTesouroTitulo(decodedTipo, vencimentoISO)

  if (!result) {
    return notFound()
  }

  const latest = result.items[0]
  const year = vencimentoISO.split("-")[0]
  const combo = `${decodedTipo} ${year}`

  return (
    <main className="p-4 sm:p-8 max-w-3xl mx-auto space-y-8 w-full flex-1">
      {/* Header Card */}
      <header className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-2 shadow-sm">
        <h1 id="titulo" className="text-2xl sm:text-3xl font-bold tracking-tight text-text-highlight">
          {decodedTipo}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-sm font-medium text-text-primary">
            Vencimento: <span id="vencimento" className="text-text-highlight font-semibold">{formatDateBR(vencimentoISO)}</span>
          </p>
          <p id="combo" className="text-xs font-mono text-text-secondary bg-bg-primary px-2.5 py-1 rounded-md border border-border">
            {combo}
          </p>
        </div>
      </header>

      {/* Latest data section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-highlight">
            Dados mais recentes
          </h2>
          <span className="text-xs text-text-secondary">
            Atualizado em: <span id="ultima-atualizacao">{new Date(result.lastUpdatedAt).toLocaleString("pt-BR")}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">Data base</span>
            <span id="data-base" className="text-text-highlight font-semibold">{formatDateBR(latest.dataBase)}</span>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">Taxa compra</span>
            <span className="text-text-highlight font-bold text-accent">
              <span id="taxa-compra">{latest.taxaCompra}</span>%
            </span>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">Taxa venda</span>
            <span className="text-text-highlight font-semibold">
              <span id="taxa-venda">{latest.taxaVenda}</span>%
            </span>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">PU compra</span>
            <span className="text-text-highlight font-semibold">
              R$ <span id="pu-compra">{latest.puCompra}</span>
            </span>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">PU venda</span>
            <span className="text-text-highlight font-semibold">
              R$ <span id="pu-venda">{latest.puVenda}</span>
            </span>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-text-secondary font-medium">PU base</span>
            <span className="text-text-highlight font-semibold">
              R$ <span id="pu-base">{latest.puBase}</span>
            </span>
          </div>
        </div>
      </section>

      {/* History toggle or full history view */}
      {showHistory ? (
        <section className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-highlight">
              Histórico Completo ({result.items.length} registros)
            </h2>
            <Link
              href={`/titulo/${encodeURIComponent(decodedTipo)}/${vencimentoISO}`}
              className="text-xs text-accent hover:underline font-medium"
            >
              Ocultar histórico
            </Link>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl bg-bg-secondary">
            <table id="historico" className="w-full text-sm border-collapse text-left">
              <thead className="bg-bg-primary border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3">Data Base</th>
                  <th className="p-3">Taxa Compra (%)</th>
                  <th className="p-3">Taxa Venda (%)</th>
                  <th className="p-3">PU Compra (R$)</th>
                  <th className="p-3">PU Venda (R$)</th>
                  <th className="p-3">PU Base (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {result.items.map((item) => (
                  <tr
                    id={formatDateBR(item.dataBase)}
                    key={item.dataBase}
                    className="hover:bg-border/30 transition-colors"
                  >
                    <td className="p-3 text-text-highlight font-sans">{formatDateBR(item.dataBase)}</td>
                    <td className="p-3 text-accent font-semibold">{item.taxaCompra}</td>
                    <td className="p-3 text-text-primary">{item.taxaVenda}</td>
                    <td className="p-3 text-text-primary">{item.puCompra}</td>
                    <td className="p-3 text-text-primary">{item.puVenda}</td>
                    <td className="p-3 text-text-primary">{item.puBase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="pt-2 flex justify-end">
          <Link
            href={`/titulo/${encodeURIComponent(decodedTipo)}/${vencimentoISO}?history=true`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-secondary border border-border text-sm font-medium text-text-highlight hover:border-accent/50 transition-all shadow-sm"
            title="Mostrar histórico"
          >
            <span className="mt-0.5">Ver histórico completo</span>
            <span className="text-accent">→</span>
          </Link>
        </div>
      )}
    </main>
  )
}