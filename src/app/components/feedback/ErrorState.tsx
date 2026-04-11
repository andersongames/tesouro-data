"use client"

/**
 * Reusable error UI component
 *
 * Used across:
 * - /search/error.tsx
 * - /titulo/[...]/error.tsx
 */
type Props = {
  title?: string
  description?: string
  onRetry?: () => void
}

export default function ErrorState({
  title = "Erro ao carregar os dados",
  description = "Não foi possível obter os dados do Tesouro.",
  onRetry,
}: Props) {
  return (
    <main className="max-w-5xl mx-auto px-4 w-full flex flex-col items-center gap-2">
      <h1 className="text-text-highlight text-lg">
        {title}
      </h1>

      <p className="text-text-secondary text-sm">
        {description}
      </p>

      <p className="text-text-secondary text-sm mt-2">
        Tente novamente em instantes.
      </p>

      <button
        onClick={onRetry}
        className="bg-accent text-white px-4 py-2 rounded-lg cursor-pointer mt-2"
      >
        Tentar novamente
      </button>
    </main>
  )
}