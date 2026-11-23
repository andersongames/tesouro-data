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
 * Interactive tabbed code block component with copy-to-clipboard functionality.
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
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      {/* Header with tabs and copy button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-primary/40">
        <div className="flex items-center gap-1 overflow-x-auto">
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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
          className="text-xs text-text-secondary hover:text-text-highlight px-2.5 py-1 rounded border border-border hover:bg-border/40 transition-colors cursor-pointer shrink-0 ml-2"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>

      {/* Code Display */}
      <pre className="p-4 text-xs sm:text-sm font-mono text-text-primary overflow-x-auto leading-relaxed">
        <code>{currentTab.code}</code>
      </pre>
    </div>
  )
}