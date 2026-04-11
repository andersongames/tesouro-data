/**
 * Application footer
 *
 * Shared across main pages
 */
export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-bg-secondary">
      <div className="max-w-5xl mx-auto px-4 py-4 text-sm text-text-secondary flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          Desenvolvido por Seu Nome
        </span>

        <div className="flex items-center gap-4">
          <a
            href="https://linkedin.com/in/seu-link"
            target="_blank"
            className="hover:text-text-highlight transition"
          >
            LinkedIn
          </a>

          <a
            href="https://github.com/seu-usuario"
            target="_blank"
            className="hover:text-text-highlight transition"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}