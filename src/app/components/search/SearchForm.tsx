"use client"

import { useState } from "react"
import { z } from "zod"
import TipoSelect from "./TipoSelect"
import VencimentoSelect from "./VencimentoSelect"

/**
 * Form validation schema
 */
const schema = z.object({
  tipo: z.string().min(1, "Selecione um tipo"),
  vencimento: z.string().min(1, "Selecione um vencimento"),
})

type Props = {
  tipos: string[]
  vencimentosMap: Record<string, string[]>
}

export default function SearchForm({ tipos, vencimentosMap }: Props) {
  const [tipo, setTipo] = useState("")
  const [vencimento, setVencimento] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = schema.safeParse({ tipo, vencimento })

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Erro no formulário")
      return
    }

    setError(null)

    /**
     * Open result in new tab (scraping-friendly requirement)
     */
    const url = `/titulo/${encodeURIComponent(tipo)}/${vencimento}`

    window.open(url, "_blank")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-secondary border border-border rounded-xl p-6 space-y-4"
    >
      <TipoSelect tipos={tipos} value={tipo} onChange={(value) => {
        setTipo(value)
        setVencimento("") // reset dependent select
      }} />

      <VencimentoSelect
        tipo={tipo}
        vencimentos={vencimentosMap[tipo] ?? []}
        value={vencimento}
        onChange={setVencimento}
      />

      {error && (
        <p className="text-error text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-accent text-white rounded-lg py-2 font-medium cursor-pointer hover:opacity-90 transition"
      >
        Buscar
      </button>
    </form>
  )
}