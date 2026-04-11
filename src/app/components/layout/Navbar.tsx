import Link from "next/link"

/**
 * Main navigation bar
 *
 * Shared across pages:
 * - /search
 * - /docs
 */
export default function Navbar() {
  return (
    <header className="w-full border-b border-border bg-bg-secondary">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Title */}
        <span className="text-text-highlight font-semibold">
          Tesouro Data
        </span>

        {/* Navigation links */}
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/search"
            className="text-text-secondary hover:text-text-highlight transition"
          >
            Buscar
          </Link>

          <Link
            href="/docs"
            className="text-text-secondary hover:text-text-highlight transition"
          >
            Docs
          </Link>
        </nav>
      </div>
    </header>
  )
}