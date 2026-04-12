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
          Desenvolvido por Anderson Games
        </span>

        <div className="flex items-center gap-4">
          <a
            href="https://www.linkedin.com/in/anderson-games-540216170/"
            target="_blank"
            className="hover:text-text-highlight transition"
            title="LinkedIn"
          >
            LinkedIn
          </a>

          <a
            href="https://github.com/andersongames"
            target="_blank"
            className="hover:text-text-highlight transition"
            title="GitHub"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}