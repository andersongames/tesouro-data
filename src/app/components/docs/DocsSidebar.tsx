"use client"

import { useEffect, useState } from "react"

export interface DocSection {
  id: string
  title: string
}

interface DocsSidebarProps {
  sections: DocSection[]
}

/**
 * Sticky sidebar navigation component for the documentation page.
 * Tracks active scroll position and provides smooth anchor navigation.
 */
export default function DocsSidebar({ sections }: DocsSidebarProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )

    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
  }, [sections])

  function handleScrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveId(id)
    }
  }

  return (
    <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20 self-start">
      <nav
        aria-label="Índice da documentação"
        className="md:sticky md:top-8 bg-bg-secondary border border-border rounded-xl p-4 space-y-2"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary px-3 pb-2 border-b border-border">
          Conteúdo
        </p>

        <ul className="space-y-1 pt-1">
          {sections.map((section) => {
            const isActive = activeId === section.id

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleScrollToSection(e, section.id)}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-accent/15 text-accent font-medium border-l-2 border-accent"
                      : "text-text-secondary hover:text-text-highlight hover:bg-border/40"
                  }`}
                >
                  {section.title}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}