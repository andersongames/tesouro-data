import Link from "next/link"
import Image from "next/image"

/**
 * Navigation header component featuring logo, title, and polished nav links.
 */
export default function Navbar() {
  return (
    <header className="w-full border-b border-border bg-bg-secondary/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Title */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none"
          title="Home"
        >
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center transition group-hover:border-accent/50">
            <Image src="/logo-small.png" alt="logo" width={24} height={24} />
          </div>
          <span className="text-text-highlight font-bold tracking-tight text-lg">
            Tesouro Data
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1.5 text-sm font-medium">
          <Link
            href="/search"
            className="px-3.5 py-2 rounded-lg text-text-primary hover:text-text-highlight hover:bg-border/50 transition-colors"
            title="Buscar título"
          >
            Buscar
          </Link>

          <Link
            href="/docs"
            className="px-3.5 py-2 rounded-lg text-text-primary hover:text-text-highlight hover:bg-border/50 transition-colors"
            title="Documentação"
          >
            Documentação
          </Link>
        </nav>
      </div>
    </header>
  )
}