"use client"

import { useState } from "react"

export interface CodeExampleTab {
  label: string
  language: string
  code: string
}

interface CodeTabsProps {
  tabs: CodeExampleTab[]
}

/**
 * Interactive tabbed code block component with copy-to-clipboard functionality
 * and isolated horizontal scrolling.
 */
export default function CodeTabs({ tabs }: CodeTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const currentTab = tabs[activeIndex] ?? tabs[0]

  async function handleCopyCode() {
    if (!currentTab) return

    try {
      await navigator.clipboard.writeText(currentTab.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!tabs.length) return null

  return (
    <div className="w-full max-w-full min-w-0 bg-bg-secondary border border-border rounded-xl overflow-hidden">
      {/* Header with tabs and copy button */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-bg-primary/40">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex

            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setActiveIndex(index)
                  setCopied(false)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-highlight hover:bg-border/50"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="text-xs text-text-secondary hover:text-text-highlight px-2.5 py-1 rounded border border-border hover:bg-border/40 transition-colors cursor-pointer shrink-0"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>

      {/* Code Display with isolated horizontal scroll */}
      <div className="w-full overflow-x-auto">
        <pre className="p-4 text-xs sm:text-sm font-mono text-text-primary leading-relaxed w-max min-w-full">
          <code>{currentTab.code}</code>
        </pre>
      </div>
    </div>
  )
}