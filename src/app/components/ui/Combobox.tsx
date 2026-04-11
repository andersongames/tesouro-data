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

  return (
    <div ref={ref} className="space-y-1 relative">
      <label htmlFor={name} className="text-sm text-text-secondary">
        {label}
      </label>

      <input
        id={name}
        name={name}
        value={displayValue || query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange("") // reset selected value
        }}
        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-bg-secondary shadow-lg">
          {filtered.map((option) => (
            <li
              key={option.label}
              onClick={() => handleSelect(option.value)}
              className="px-3 py-2 cursor-pointer hover:bg-bg-primary"
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}