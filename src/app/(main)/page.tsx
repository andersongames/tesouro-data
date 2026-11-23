import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Tesouro Data - Início",
  description:
    "Visualize e pesquise dados de títulos do Tesouro Direto de forma rápida, eficiente e estruturada.",
}

/**
 * Home page component featuring a centered hero CTA section
 * directing users to search bonds or explore API documentation.
 */
export default async function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 w-full py-12 text-center">
      <div className="space-y-6">
        <span className="inline-block px-3 py-1 text-sm font-medium text-accent bg-blue-500/10 rounded-full border border-accent/20">
          Dados Oficiais do Tesouro Direto
        </span>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-highlight">
          Análise e Consulta de Títulos Públicos com Alta Performance
        </h1>
        
        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
          Acesse históricos detalhados, taxas e preços unitários dos títulos do Tesouro Nacional de forma simples, com suporte a integração via API e web scraping.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-colors duration-150"
          >
            Buscar Títulos
          </Link>
          
          <Link
            href="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-medium text-text-primary bg-bg-secondary hover:bg-border/60 border border-border rounded-lg shadow-sm transition-colors duration-150"
          >
            Ver Documentação
          </Link>
        </div>
      </div>
    </div>
  )
}