"use client"

import { useState, useMemo, useRef, useEffect } from "react"

type Option = {
  value: string
  label: string
}

type Props = {
  label: string
  name: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function Combobox({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  /**
   * Highlight currently focused option (keyboard navigation)
   *
   * This provides visual feedback for the user while navigating
   * with ArrowUp / ArrowDown keys.
   */
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const listRef = useRef<HTMLUListElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  /**
   * Find selected option (if any)
   */
  const selectedOption = options.find((opt) => opt.value === value)

  /**
   * Input display logic:
   * - If user is typing → show query
   * - If selected → show label
   * - Otherwise → empty
   */
  const displayValue = query || selectedOption?.label || ""

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    /**
     * Ensure the highlighted option is always visible
     * when navigating with keyboard (ArrowUp / ArrowDown)
     *
     * This improves UX for long lists where items may be out of view.
     */
    if (highlightedIndex < 0) return

    const el = listRef.current?.children[highlightedIndex] as HTMLElement
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightedIndex])

  /**
   * Filter options based on query
   */
  const filtered = useMemo(() => {
    if (!query) return options

    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase())
    )
  }, [query, options])

  function handleSelect(option: string) {
    onChange(option)
    setQuery("")
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    /**
     * Open dropdown when using arrow keys while closed
     */
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true)
      return
    }

    /**
     * If there are no options, do nothing
     */
    if (!filtered.length) return

    switch (e.key) {
      case "ArrowDown":
        /**
         * Move highlight down
         * - Wraps to the first item when reaching the end
         */
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        )
        break

      case "ArrowUp":
        /**
         * Move highlight up
         * - Wraps to the last item when reaching the top
         */
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        )
        break

      case "Enter":
        /**
         * Select currently highlighted option
         */
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSelect(filtered[highlightedIndex].value)
        }
        break

      case "Escape":
        /**
         * Close dropdown and reset navigation state
         */
        setOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div ref={ref} className="space-y-1 relative">
      <label htmlFor={`${name}-combobox`} className="text-sm text-text-secondary">
        {label}
      </label>

      <input
        id={`${name}-combobox`}
        name={`${name}-combobox`}
        value={displayValue || query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const value = e.target.value

          setQuery(value)
          /**
           * Reset highlighted index when user starts typing
           *
           * We do this inside the input change handler instead of an effect
           * to avoid unnecessary re-renders and React warnings about
           * synchronous state updates inside effects.
           */
          setHighlightedIndex(-1) // reset navigation here (safe)
          onChange("") // reset selected value
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />

      {open && filtered.length > 0 && (
        <ul ref={listRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-bg-secondary shadow-lg">
          {filtered.map((option, index) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                px-3 py-2 cursor-pointer
                ${index === highlightedIndex ? "bg-accent" : ""}
                hover:bg-accent
              `}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}