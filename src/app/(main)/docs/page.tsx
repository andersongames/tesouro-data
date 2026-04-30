import { getBaseUrl } from "@/lib/server/url"
import { getTesouroData } from "@/lib/services/tesouro.service"
import { formatDateBR } from "@/lib/utils/date"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentação",
  description:
    "Aprenda a consultar e integrar dados do Tesouro Direto via URL, scraping ou API.",
}

/**
 * Documentation page
 *
 * Explains:
 * - How to use the app
 * - How to consume data via URL
 * - How to scrape the result page
 * - Scraping examples
 * - API documentation
 *
 * This page is static and optimized for readability.
 */
export default async function DocsPage() {
  const baseUrl = await getBaseUrl()
  const { latestDataBase } = await getTesouroData()

  return (
    <main className="max-w-5xl w-full mx-auto px-4 py-10 space-y-10">
      {/* Title */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-highlight">
          Documentação
        </h1>
        <p className="text-text-secondary">
          Guia de uso e integração com os dados do Tesouro Direto.
        </p>
      </header>

      {/* Section: Overview */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Visão geral
        </h2>

        <p className="text-text-secondary">
          Esta aplicação permite consultar dados de títulos do Tesouro Direto
          de forma simples, com foco em performance e facilidade de integração.
        </p>
      </section>

      {/* ========================= */}
      {/* DATA SOURCE */}
      {/* ========================= */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Fonte dos dados
        </h2>

        <p className="text-text-secondary">
          Os dados utilizados nesta aplicação são fornecidos oficialmente pelo Tesouro Nacional,
          através do portal Tesouro Transparente.
        </p>

        <p className="text-text-secondary">
          O dataset contém informações diárias sobre taxas e preços dos títulos do Tesouro Direto.
        </p>

        <a
          href="https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-accent hover:text-text-highlight transition text-sm"
        >
          Acessar página oficial do dataset →
        </a>

        <div className="bg-bg-secondary border border-border rounded-lg p-3 text-xs break-all">
          https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1
        </div>

        <p className="text-text-secondary text-sm">
          Os dados são atualizados diariamente e processados pela aplicação para otimizar
          consultas e integração via API.
        </p>

        {latestDataBase && (
          <p className="text-text-secondary text-sm">
            Última atualização disponível no dataset:{" "}
            <strong className="text-text-highlight">
              {formatDateBR(latestDataBase)}
            </strong>
          </p>
        )}
      </section>

      {/* Section: Search */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Como usar a busca
        </h2>

        <p className="text-text-secondary">
          Acesse a página de busca, selecione o tipo de título e o vencimento,
          e clique em <strong>Buscar</strong>.
        </p>

        <p className="text-text-secondary">
          O resultado será aberto em uma nova aba.
        </p>
      </section>

      {/* Section: URL */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Acesso direto via URL
        </h2>

        <p className="text-text-secondary">
          Você pode acessar os dados diretamente via URL:
        </p>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /titulo/{`{tipo}`}/{`{vencimento}`}
        </code>

        <p className="text-text-secondary">
          O parâmetro <strong>vencimento</strong> aceita dois formatos:
        </p>

        <ul className="list-disc pl-5 text-text-secondary text-sm space-y-1">
          <li>ISO: <code>YYYY-MM-DD</code></li>
          <li>BR: <code>DD-MM-YYYY</code></li>
        </ul>

        <p className="text-text-secondary">
          Exemplos:
        </p>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /titulo/Tesouro%20Prefixado/2029-01-01
        </code>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /titulo/Tesouro%20Prefixado/01-01-2029
        </code>

        <p className="text-text-secondary text-sm">
          Outros formatos (ex: <code>DD/MM/YYYY</code>) não são suportados.
        </p>
      </section>

      {/* Section: History */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Histórico
        </h2>

        <p className="text-text-secondary">
          Para obter o histórico completo do título, utilize o parâmetro:
        </p>

        <ul className="list-disc pl-5 text-text-secondary text-sm space-y-1">
          <li><code>history=true</code></li>
        </ul>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /titulo/Tesouro%20Prefixado/01-01-2029?history=true
        </code>
      </section>

      {/* Section: Scraping */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Scraping
        </h2>

        <p className="text-text-secondary">
          A página de resultado foi otimizada com IDs estáveis para facilitar extração.
        </p>

        <p className="text-text-secondary">
          Os dados possuem identificadores estáveis (IDs), permitindo extração direta.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm space-y-2">
          <p><strong>#titulo</strong> → nome do título</p>
          <p><strong>#vencimento</strong> → data de vencimento</p>
          <p><strong>#data-base</strong> → data base</p>
          <p><strong>#taxa-compra</strong></p>
          <p><strong>#taxa-venda</strong></p>
          <p><strong>#pu-compra</strong></p>
          <p><strong>#pu-venda</strong></p>
          <p><strong>#pu-base</strong></p>
          <p><strong>#ultima-atualizacao</strong> → última atualização dos dados</p>
        </div>

                {/* JS Example */}
        <div className="space-y-2">
          <p className="text-text-secondary">Exemplo em JavaScript:</p>

          <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`const res = await fetch("${baseUrl}/titulo/Tesouro%20Prefixado/2029-01-01");
const html = await res.text();

const doc = new DOMParser().parseFromString(html, "text/html");

const titulo = doc.querySelector("#titulo")?.textContent;
const taxa = doc.querySelector("#taxa-compra")?.textContent;

console.log({ titulo, taxa });`}
          </pre>
        </div>

        <div className="space-y-2">
          <p className="text-text-secondary">Exemplo no Google Sheets:</p>

          <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`=IMPORTXML(
  "${baseUrl}/titulo/Tesouro%20Prefixado/2029-01-01",
  "//*[@id='taxa-compra']"
)`}
          </pre>
        </div>
      </section>

      {/* ========================= */}
      {/* API /api/titulo */}
      {/* ========================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-highlight">
          API: /api/titulo
        </h2>

        <p className="text-text-secondary">
          Retorna dados de um título específico.
        </p>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /api/titulo?tipo=...&vencimento=YYYY-MM-DD
        </code>

        <p className="text-text-secondary">Parâmetros:</p>
        <ul className="list-disc pl-5 text-text-secondary text-sm">
          <li>tipo (string)</li>
          <li>vencimento (YYYY-MM-DD ou DD-MM-YYYY)</li>
          <li>from / to (opcional)</li>
          <li>limit (opcional)</li>
        </ul>

        <p className="text-text-secondary text-sm">
          Os parâmetros <strong>vencimento</strong>, <strong>from</strong> e <strong>to</strong>, aceitam:
          <br />• Formato ISO: <code>YYYY-MM-DD</code>
          <br />• Formato BR com hífen: <code>DD-MM-YYYY</code>
        </p>

        <p className="text-text-secondary">
          Exemplos:
        </p>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01
        </code>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /api/titulo?tipo=Tesouro%20Prefixado&vencimento=01-01-2029
        </code>

        <p className="text-text-secondary">Resposta:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "dataBase": "2026-04-10",
      "taxaCompra": 10.45,
      "taxaVenda": 10.30,
      "puCompra": 745.32,
      "puVenda": 742.10,
      "puBase": 743.50
    }
  ],
  "total": 120,
  "fetchedAt": "2026-04-10T10:00:00.000Z"
}`}
        </pre>

        <p className="text-text-secondary text-sm">
          <strong>items:</strong> lista de registros históricos do título (ordenados do mais recente para o mais antigo)
        </p>

        {/* JS */}
        <p className="text-text-secondary">Exemplo em JavaScript:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`const res = await fetch("/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01");
const data = await res.json();`}
        </pre>

        {/* Python */}
        <p className="text-text-secondary">Exemplo em Python:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`import requests

res = requests.get(
  "${baseUrl}/api/titulo",
  params={
    "tipo": "Tesouro Prefixado",
    "vencimento": "2029-01-01"
  }
)

print(res.json())`}
        </pre>
      </section>

      {/* ========================= */}
      {/* API /api/titulos */}
      {/* ========================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-highlight">
          API: /api/titulos
        </h2>

        <p className="text-text-secondary">
          Retorna todos os títulos com filtros.
        </p>

        <code className="block bg-bg-secondary border border-border rounded-lg p-3 text-sm">
          /api/titulos?maturity=all|future|expired&grouped=true
        </code>

        <p className="text-text-secondary">Parâmetros:</p>
        <ul className="list-disc pl-5 text-text-secondary text-sm">
          <li>maturity: future | expired | all</li>
          <li>grouped: boolean</li>
        </ul>

        {/* Response */}
        <p className="text-text-secondary">Resposta padrão:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "dataBase": "2026-04-10",
      "taxaCompra": 10.45,
      "taxaVenda": 10.30,
      "puCompra": 745.32,
      "puVenda": 742.10,
      "puBase": 743.50
    },
    {
      "tipo": "Tesouro IPCA+",
      "vencimento": "2035-05-15",
      "dataBase": "2026-04-10",
      "taxaCompra": 5.12,
      "taxaVenda": 5.05,
      "puCompra": 2890.10,
      "puVenda": 2875.50,
      "puBase": 2882.30
    }
  ],
  "total": 350,
  "fetchedAt": "2026-04-10T10:00:00.000Z",
  "grouped": false
}`}
        </pre>

        <p className="text-text-secondary">
          Quando <strong>grouped=true</strong>, os dados vêm agrupados por título.
        </p>

        {/* Response grouped*/}
        <p className="text-text-secondary">Resposta grouped=true:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`{
  "items": [
    {
      "tipo": "Tesouro Prefixado",
      "vencimento": "2029-01-01",
      "items": [
        {
          "dataBase": "2026-04-10",
          "taxaCompra": 10.45,
          "taxaVenda": 10.30,
          "puCompra": 745.32,
          "puVenda": 742.10,
          "puBase": 743.50
        },
        {
          "dataBase": "2026-04-09",
          "taxaCompra": 10.40,
          "taxaVenda": 10.25,
          "puCompra": 744.10,
          "puVenda": 741.00,
          "puBase": 742.50
        }
      ]
    }
  ],
  "total": 25,
  "fetchedAt": "2026-04-10T10:00:00.000Z",
  "grouped": true
}`}
        </pre>

        <p className="text-text-secondary text-sm">
          Quando <strong>grouped=true</strong>, cada item representa um título único
          contendo sua lista de registros históricos.
        </p>

        {/* JS */}
        <p className="text-text-secondary">Exemplo em JavaScript:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`const res = await fetch("/api/titulos?grouped=true");
const data = await res.json();`}
        </pre>

        {/* Python */}
        <p className="text-text-secondary">Exemplo em Python:</p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-3 text-xs overflow-auto">
{`import requests

res = requests.get(
  "${baseUrl}/api/titulos",
  params={"grouped": True}
)

print(res.json())`}
        </pre>
      </section>

      {/* ========================= */}
      {/* NOTES */}
      {/* ========================= */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium text-text-highlight">
          Observações
        </h2>

        <ul className="list-disc pl-5 text-text-secondary space-y-1">
          <li>Dados atualizados diariamente</li>
          <li>Datas no formato ISO (YYYY-MM-DD)</li>
          <li>Página otimizada para scraping e baixa latência</li>
        </ul>
      </section>
    </main>
  )
}