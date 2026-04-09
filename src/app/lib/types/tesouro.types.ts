// Represents a single Tesouro Direto bond entry after normalization
export type TesouroTitulo = {
  tipo: string
  vencimento: string // ISO format (YYYY-MM-DD)
  dataBase: string // ISO format (YYYY-MM-DD)
  taxaCompra: number
  taxaVenda: number
  puCompra: number
  puVenda: number
  puBase: number
}

// Raw CSV row before normalization (string-based)
export type TesouroCSVRow = {
  "Tipo Titulo": string
  "Data Vencimento": string
  "Data Base": string
  "Taxa Compra Manha": string
  "Taxa Venda Manha": string
  "PU Compra Manha": string
  "PU Venda Manha": string
  "PU Base Manha": string
}