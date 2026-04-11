import { findTesouroTitulo } from "@/lib/services/tesouro.service"
import { notFound } from "next/navigation"
import { formatDateBR } from "@/lib/utils/date"

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

/**
 * Minimal SSR page optimized for:
 * - scraping (stable IDs)
 * - performance (no client JS)
 */
export default async function TituloPage({
  params,
  searchParams,
}: Props) {
  const { tipo, vencimento } = await params
  const { history } = await searchParams

  const decodedTipo = decodeURIComponent(tipo)
  const showHistory = history === "true"

  const result = await findTesouroTitulo(decodedTipo, vencimento)

  console.log(decodedTipo, vencimento, result)

  if (!result) {
    return notFound()
  }

  const latest = result.items[0]

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <header>
        <h1 id="titulo" className="text-xl font-semibold text-text-highlight">
          {decodedTipo}
        </h1>

        <p id="vencimento" className="text-text-secondary">
          Vencimento: {formatDateBR(vencimento)}
        </p>
      </header>

      {/* Latest data (default view) */}
      <section className="space-y-2">
        <h2 className="text-text-highlight font-medium">
          Dados mais recentes
        </h2>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div id="data-base">
            <span className="text-text-secondary">Data base:</span>{" "}
            {formatDateBR(latest.dataBase)}
          </div>

          <div id="taxa-compra">
            <span className="text-text-secondary">Taxa compra:</span>{" "}
            {latest.taxaCompra}
          </div>

          <div id="taxa-venda">
            <span className="text-text-secondary">Taxa venda:</span>{" "}
            {latest.taxaVenda}
          </div>

          <div id="pu-compra">
            <span className="text-text-secondary">PU compra:</span>{" "}
            {latest.puCompra}
          </div>

          <div id="pu-venda">
            <span className="text-text-secondary">PU venda:</span>{" "}
            {latest.puVenda}
          </div>

          <div id="pu-base">
            <span className="text-text-secondary">PU base:</span>{" "}
            {latest.puBase}
          </div>
        </div>
      </section>

      {/* Metadata */}
      <footer className="text-xs text-text-secondary">
        <span id="ultima-atualizacao">
          Última atualização: {new Date(result.fetchedAt).toLocaleString("pt-BR")}
        </span>
      </footer>

      {/* History (optional) */}
      {showHistory && (
        <section className="mt-6">
          <h2 className="text-text-highlight font-medium mb-2">
            Histórico
          </h2>

          <div className="overflow-auto border border-border rounded-lg">
            <table
              id="historico"
              className="w-full text-sm border-collapse"
            >
              <thead className="bg-bg-secondary">
                <tr className="text-text-secondary">
                  <th className="p-2 text-left">Data Base</th>
                  <th className="p-2 text-left">Taxa Compra</th>
                  <th className="p-2 text-left">Taxa Venda</th>
                  <th className="p-2 text-left">PU Compra</th>
                  <th className="p-2 text-left">PU Venda</th>
                  <th className="p-2 text-left">PU Base</th>
                </tr>
              </thead>

              <tbody>
                {result.items.map((item) => (
                  <tr
                    id={formatDateBR(item.dataBase)}
                    key={item.dataBase}
                    className="border-t border-border"
                  >
                    <td className="p-2">
                      {formatDateBR(item.dataBase)}
                    </td>
                    <td className="p-2">{item.taxaCompra}</td>
                    <td className="p-2">{item.taxaVenda}</td>
                    <td className="p-2">{item.puCompra}</td>
                    <td className="p-2">{item.puVenda}</td>
                    <td className="p-2">{item.puBase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}