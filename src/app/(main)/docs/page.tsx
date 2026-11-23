import { getBaseUrl } from "@/lib/server/url"
import { formatDateBR } from "@/lib/utils/date"
import DocsSidebar, { DocSection } from "@/app/components/docs/DocsSidebar"
import CodeTabs from "@/app/components/docs/CodeTabs"
import { Metadata } from "next"
import fs from "fs"
import path from "path"

export const metadata: Metadata = {
  title: "Documentação",
  description:
    "Aprenda a consultar e integrar dados do Tesouro Direto via URL, scraping ou API.",
}

interface DatasetMetadata {
  lastUpdatedAt: string
  latestDataBase: string | null
  dataSource: string
}

/**
 * Reads local dataset metadata directly from metadata.json without loading full datasets.
 */
function readDatasetMetadata(): DatasetMetadata | null {
  const metadataPath = path.join(process.cwd(), "src/lib/data/datasets/metadata.json")

  if (!fs.existsSync(metadataPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(metadataPath, "utf-8")
    return JSON.parse(content) as DatasetMetadata
  } catch {
    return null
  }
}

const DOC_SECTIONS: DocSection[] = [
  { id: "visao-geral", title: "Visão Geral" },
  { id: "fonte-dados", title: "Fonte dos Dados" },
  { id: "busca-direta", title: "Busca e Acesso via URL" },
  { id: "scraping", title: "Web Scraping" },
  { id: "api-titulo", title: "API: /api/titulo" },
  { id: "api-titulos", title: "API: /api/titulos" },
  { id: "observacoes", title: "Observações Gerais" },
]

/**
 * Documentation page featuring a sticky table of contents sidebar,
 * direct metadata reading, improved typography, and tabbed code examples.
 */
export default async function DocsPage() {
  const baseUrl = await getBaseUrl()
  const metadataInfo = readDatasetMetadata()

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-10">
      {/* Page Header */}
      <header className="space-y-3 pb-8 border-b border-border">
        <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-blue-500/10 rounded-full border border-accent/20">
          Guia de Integração
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-highlight">
          Documentação
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl">
          Aprenda a consultar, extrair e integrar taxas e preços dos títulos do Tesouro Direto via URL, scraping ou API REST.
        </p>
      </header>

      {/* Main Content Layout: Sticky Sidebar + Documentation Body */}
      <div className="flex flex-col md:flex-row gap-8 pt-8 items-start">
        <DocsSidebar sections={DOC_SECTIONS} />

        <div className="flex-1 min-w-0 space-y-12">
          {/* Section 1: Overview */}
          <section id="visao-geral" className="scroll-mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-text-highlight">
              Visão Geral
            </h2>
            <p className="text-base text-text-primary leading-relaxed">
              Esta aplicação permite consultar dados históricos e atuais de títulos do Tesouro Direto de forma simples, rápida e estruturada, com foco em baixa latência e facilidade de integração.
            </p>
          </section>

          <hr className="border-border" />

          {/* Section 2: Data Source */}
          <section id="fonte-dados" className="scroll-mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-text-highlight">
              Fonte dos Dados
            </h2>
            <p className="text-base text-text-primary leading-relaxed">
              Os dados são fornecidos oficialmente pelo Tesouro Nacional através do portal <strong>Tesouro Transparente</strong>, contendo informações diárias sobre taxas de compra/venda e preços unitários (PU).
            </p>

            <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-medium text-text-highlight">
                  Dataset Oficial (CKAN)
                </span>
                <a
                  href="https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline font-medium"
                >
                  Acessar portal oficial →
                </a>
              </div>

              <code className="block bg-bg-primary border border-border rounded-lg p-3 text-xs text-text-secondary break-all">
                https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1
              </code>

              {metadataInfo?.latestDataBase && (
                <div className="pt-2 border-t border-border flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span>
                    Última data base disponível:{" "}
                    <strong className="text-text-highlight">
                      {formatDateBR(metadataInfo.latestDataBase)}
                    </strong>
                  </span>
                  <span>
                    Fonte ativa:{" "}
                    <strong className="text-text-highlight uppercase">
                      {metadataInfo.dataSource}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 3: Search & Direct URL */}
          <section id="busca-direta" className="scroll-mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-text-highlight">
              Busca e Acesso via URL
            </h2>
            <p className="text-base text-text-primary leading-relaxed">
              Você pode utilizar a interface visual na página <code className="text-accent">/search</code> ou acessar diretamente qualquer título através da estrutura de URL amigável:
            </p>

            <code className="block bg-bg-secondary border border-border rounded-xl p-4 text-sm font-mono text-text-highlight">
              /titulo/{`{tipo}`}/{`{vencimento}`}
            </code>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-text-highlight">
                  Formatos de Vencimento Aceitos
                </h3>
                <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1">
                  <li>Formato ISO: <code className="text-text-primary">YYYY-MM-DD</code></li>
                  <li>Formato BR: <code className="text-text-primary">DD-MM-YYYY</code></li>
                </ul>
                <p className="text-xs text-text-secondary pt-1">
                  Formatos com barra (<code className="text-error">DD/MM/YYYY</code>) não são suportados.
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-text-highlight">
                  Histórico Completo na Página
                </h3>
                <p className="text-sm text-text-secondary">
                  Adicione o parâmetro <code className="text-text-primary">?history=true</code> para exibir a tabela completa de evolução do título:
                </p>
                <code className="block bg-bg-primary border border-border rounded p-2 text-xs text-text-primary break-all">
                  /titulo/Tesouro%20Prefixado/2029-01-01?history=true
                </code>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 4: Web Scraping */}
          <section id="scraping" className="scroll-mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-text-highlight">
              Web Scraping
            </h2>
            <p className="text-base text-text-primary leading-relaxed">
              A página de resultados renderiza elementos HTML com identificadores (<code className="text-accent">id</code>) fixos e semânticos, permitindo extração direta sem depender de classes CSS.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: "#titulo", desc: "Nome do título" },
                { id: "#vencimento", desc: "Data de vencimento" },
                { id: "#combo", desc: "Combinação de nome e vencimento" },
                { id: "#data-base", desc: "Data de referência" },
                { id: "#taxa-compra", desc: "Taxa de compra (%)" },
                { id: "#taxa-venda", desc: "Taxa de venda (%)" },
                { id: "#pu-compra", desc: "PU de compra (R$)" },
                { id: "#pu-venda", desc: "PU de venda (R$)" },
                { id: "#pu-base", desc: "PU base (R$)" },
                { id: "#ultima-atualizacao", desc: "Data de atualização" },
              ].map((selector) => (
                <div
                  key={selector.id}
                  className="bg-bg-secondary border border-border rounded-lg p-3 flex flex-col justify-between"
                >
                  <code className="text-sm font-semibold text-accent">
                    {selector.id}
                  </code>
                  <span className="text-xs text-text-secondary mt-1">
                    {selector.desc}
                  </span>
                </div>
              ))}
            </div>

            <CodeTabs
              tabs={[
                {
                  label: "JavaScript (Fetch + DOMParser)",
                  language: "javascript",
                  code: `const res = await fetch("${baseUrl}/titulo/Tesouro%20Prefixado/2029-01-01");
const html = await res.text();

const doc = new DOMParser().parseFromString(html, "text/html");
const titulo = doc.querySelector("#titulo")?.textContent;
const taxa = doc.querySelector("#taxa-compra")?.textContent;

console.log({ titulo, taxa });`,
                },
                {
                  label: "Google Sheets (IMPORTXML)",
                  language: "excel",
                  code: `=IMPORTXML(
  "${baseUrl}/titulo/Tesouro%20Prefixado/2029-01-01",
  "//*[@id='taxa-compra']"
)`,
                },
              ]}
            />
          </section>

          <hr className="border-border" />

          {/* Section 5: API /api/titulo */}
          <section id="api-titulo" className="scroll-mt-8 space-y-5">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold bg-success/15 text-success rounded-md border border-success/30">
                GET
              </span>
              <h2 className="text-2xl font-semibold text-text-highlight">
                /api/titulo
              </h2>
            </div>

            <p className="text-base text-text-primary leading-relaxed">
              Retorna a série histórica de preços e taxas para um título específico, acompanhada dos metadados do dataset.
            </p>

            <code className="block bg-bg-secondary border border-border rounded-xl p-4 text-sm font-mono text-text-highlight">
              /api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01
            </code>

            <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-highlight">
                Parâmetros de Query
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <code className="text-text-highlight font-semibold">tipo</code>{" "}
                  <span className="text-error text-xs">(obrigatório)</span> — Nome do título (ex: <code>Tesouro Selic</code>).
                </li>
                <li>
                  <code className="text-text-highlight font-semibold">vencimento</code>{" "}
                  <span className="text-error text-xs">(obrigatório)</span> — Data de vencimento (<code>YYYY-MM-DD</code> ou <code>DD-MM-YYYY</code>).
                </li>
                <li>
                  <code className="text-text-highlight font-semibold">from / to</code>{" "}
                  <span className="text-xs">(opcional)</span> — Filtra o período da série histórica (mesmos formatos de data).
                </li>
                <li>
                  <code className="text-text-highlight font-semibold">limit</code>{" "}
                  <span className="text-xs">(opcional)</span> — Limita a quantidade de registros retornados (ex: <code>limit=1</code> para o mais recente).
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-highlight">
                Exemplo de Resposta JSON
              </h3>
              <pre className="bg-bg-secondary border border-border rounded-xl p-4 text-xs sm:text-sm font-mono text-text-primary overflow-x-auto leading-relaxed">
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
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live"
}`}
              </pre>
            </div>

            <CodeTabs
              tabs={[
                {
                  label: "JavaScript",
                  language: "javascript",
                  code: `const res = await fetch("${baseUrl}/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01");
const data = await res.json();
console.log(data);`,
                },
                {
                  label: "Python",
                  language: "python",
                  code: `import requests

res = requests.get(
    "${baseUrl}/api/titulo",
    params={
        "tipo": "Tesouro Prefixado",
        "vencimento": "2029-01-01"
    }
)

print(res.json())`,
                },
                {
                  label: "cURL",
                  language: "bash",
                  code: `curl -X GET "${baseUrl}/api/titulo?tipo=Tesouro%20Prefixado&vencimento=2029-01-01"`,
                },
              ]}
            />
          </section>

          <hr className="border-border" />

          {/* Section 6: API /api/titulos */}
          <section id="api-titulos" className="scroll-mt-8 space-y-5">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold bg-success/15 text-success rounded-md border border-success/30">
                GET
              </span>
              <h2 className="text-2xl font-semibold text-text-highlight">
                /api/titulos
              </h2>
            </div>

            <p className="text-base text-text-primary leading-relaxed">
              Retorna a listagem completa de títulos disponíveis no dataset, suportando filtros por situação de vencimento e agrupamento por título.
            </p>

            <code className="block bg-bg-secondary border border-border rounded-xl p-4 text-sm font-mono text-text-highlight">
              /api/titulos?maturity=all|future|expired&grouped=true
            </code>

            <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-highlight">
                Parâmetros de Query
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <code className="text-text-highlight font-semibold">maturity</code>{" "}
                  <span className="text-xs">(opcional)</span> — Filtra títulos por vencimento: <code>future</code>, <code>expired</code> ou <code>all</code>.
                </li>
                <li>
                  <code className="text-text-highlight font-semibold">grouped</code>{" "}
                  <span className="text-xs">(opcional, boolean)</span> — Quando <code>true</code>, agrupa os registros históricos dentro de cada título único.
                </li>
              </ul>
            </div>

            <CodeTabs
              tabs={[
                {
                  label: "Resposta Padrão (grouped=false)",
                  language: "json",
                  code: `{
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
  "total": 350,
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live",
  "grouped": false
}`,
                },
                {
                  label: "Resposta Agrupada (grouped=true)",
                  language: "json",
                  code: `{
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
        }
      ]
    }
  ],
  "total": 25,
  "lastUpdatedAt": "2026-04-10T10:00:00.000Z",
  "latestDataBase": "2026-04-10",
  "dataSource": "live",
  "grouped": true
}`,
                },
              ]}
            />

            <CodeTabs
              tabs={[
                {
                  label: "JavaScript",
                  language: "javascript",
                  code: `const res = await fetch("${baseUrl}/api/titulos?grouped=true");
const data = await res.json();
console.log(data);`,
                },
                {
                  label: "Python",
                  language: "python",
                  code: `import requests

res = requests.get(
    "${baseUrl}/api/titulos",
    params={"grouped": True}
)

print(res.json())`,
                },
              ]}
            />
          </section>

          <hr className="border-border" />

          {/* Section 7: Notes */}
          <section id="observacoes" className="scroll-mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-text-highlight">
              Observações Gerais
            </h2>
            <ul className="list-disc pl-5 text-base text-text-secondary space-y-2">
              <li>Os datasets são particionados por ano de vencimento e atualizados diariamente via automação.</li>
              <li>Todas as datas retornadas pela API seguem o padrão ISO 8601 (<code className="text-text-primary">YYYY-MM-DD</code>).</li>
              <li>Os registros históricos dentro de <code className="text-text-primary">items</code> são sempre ordenados da data base mais recente para a mais antiga.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}