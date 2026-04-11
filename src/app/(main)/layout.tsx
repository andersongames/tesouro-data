import Navbar from "@/app/components/layout/Navbar"
import Footer from "@/app/components/layout/Footer"

/**
 * Layout used by:
 * - /search
 * - /docs
 *
 * Provides:
 * - Navbar
 * - Footer
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center">
        {children}
      </main>

      <Footer />
    </div>
  )
}