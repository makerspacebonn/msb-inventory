import { Input } from "@components/ui/input"
import { PlusIcon } from "lucide-react"
import { type KeyboardEvent, useState } from "react"

type CategoryComboboxProps = {
  id?: string
  value: string
  categories: string[]
  onChange: (value: string) => void
  onBlur?: () => void
}

type Option = { value: string; label: string; isNew: boolean }

// Text input with a filtered list of existing categories. If nothing
// matches, the last option creates the typed category (it's added to the
// list when the item is saved).
export function CategoryCombobox({
  id,
  value,
  categories,
  onChange,
  onBlur,
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)

  const query = value.trim().toLowerCase()
  const matches = categories.filter((c) => c.toLowerCase().includes(query))
  const hasExactMatch = categories.some((c) => c.toLowerCase() === query)

  const options: Option[] = matches.map((c) => ({
    value: c,
    label: c,
    isNew: false,
  }))
  if (query && !hasExactMatch) {
    options.push({
      value: value.trim(),
      label: `Neue Kategorie „${value.trim()}" anlegen`,
      isNew: true,
    })
  }

  const select = (option: Option) => {
    onChange(option.value)
    setIsOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIsOpen(true)
      setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter" && isOpen && options[highlighted]) {
      e.preventDefault() // don't submit the form
      select(options[highlighted])
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder="Kategorie wählen..."
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setHighlighted(0)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setIsOpen(false)
          onBlur?.()
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && options.length > 0 && (
        <div
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {options.map((option, index) => (
            <div
              key={option.label}
              role="option"
              tabIndex={-1}
              aria-selected={index === highlighted}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                index === highlighted ? "bg-muted" : ""
              } ${option.isNew ? "text-emerald-600" : ""}`}
              // mousedown instead of click: runs before the input's blur
              onMouseDown={(e) => {
                e.preventDefault()
                select(option)
              }}
              onMouseEnter={() => setHighlighted(index)}
            >
              {option.isNew && <PlusIcon className="w-4 h-4" />}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
