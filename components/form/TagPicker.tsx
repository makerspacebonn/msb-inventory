import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@components/ui/dialog"
import { PlusIcon, TagIcon, XIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { fetchAutocompleteTags } from "@/src/actions/tagActions"
import { addTag, suggestionsFor } from "@/src/lib/tagInput"

type TagPickerProps = {
  id?: string
  tags: string[]
  onChange: (tags: string[]) => void
}

/**
 * The item's tags as chips, and a "+" button that opens an overlay for
 * adding one: the input sits at the top (on phones the overlay fills the
 * screen, so the keyboard never covers it) and existing tags are
 * suggested below. Choosing a tag or pressing Enter adds it and closes
 * the overlay; X closes it without a change.
 */
export function TagPicker({ id, tags, onChange }: TagPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div id={id} className="flex flex-wrap items-center gap-1.5">
      {tags.length > 0 && (
        <ul aria-label="Tags" className="contents">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-950 py-1 pl-3 pr-1 text-sm text-emerald-100"
            >
              {tag}
              <button
                type="button"
                className="rounded-full p-1 text-emerald-300 hover:bg-emerald-900 hover:text-white"
                aria-label={`Tag ${tag} entfernen`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="h-4 w-4" />
        Tag hinzufügen
      </Button>
      <TagOverlay
        open={open}
        onOpenChange={setOpen}
        tags={tags}
        onAdd={(next) => {
          onChange(next)
          setOpen(false)
        }}
      />
    </div>
  )
}

function TagOverlay({
  open,
  onOpenChange,
  tags,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: string[]
  onAdd: (tags: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const latestRequest = useRef(0)
  const listId = useId()

  // Start empty every time the overlay opens
  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  // Most used tags first; while typing, the ones containing the text.
  // Only the answer to the latest request counts, as answers can overtake
  // each other while typing fast
  useEffect(() => {
    if (!open) return
    const request = ++latestRequest.current
    const timer = setTimeout(async () => {
      try {
        const found = await fetchAutocompleteTags({
          data: query.trim() || undefined,
        })
        if (request === latestRequest.current) setSuggestions(found)
      } catch {
        if (request === latestRequest.current) setSuggestions([])
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [open, query])

  const shown = suggestionsFor(suggestions, tags)
  const typed = query.trim().replace(/\s+/g, " ")
  // Offered as a new tag only if it isn't on the item or among the
  // suggestions yet (in any case)
  const withTyped = addTag(tags, typed, suggestions)
  const isNew = withTyped.length > tags.length && withTyped.at(-1) === typed

  const add = (text: string) => onAdd(addTag(tags, text, suggestions))

  // Rows the arrow keys move through: the typed text as a new tag first,
  // then the existing tags. -1 means none is selected, so Enter takes the
  // typed text
  const options = [
    ...(isNew ? [{ tag: typed, isNew: true }] : []),
    ...shown.map((tag) => ({ tag, isNew: false })),
  ]
  const [active, setActive] = useState(-1)
  const optionId = (index: number) => `${listId}-${index}`

  // A new text or new suggestions start without a selection
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the rows change
  useEffect(() => setActive(-1), [query, suggestions])

  // Keep the selected row visible in a long list
  useEffect(() => {
    if (active < 0) return
    document
      .getElementById(optionId(active))
      ?.scrollIntoView({ block: "nearest" })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full screen on phones, a normal dialog near the top on larger
          screens; the input is first in both */}
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-0 p-4 sm:top-[10%] sm:left-1/2 sm:h-auto sm:max-h-[80dvh] sm:max-w-md sm:-translate-x-1/2 sm:rounded-lg sm:border sm:p-6"
      >
        <DialogTitle className="sr-only">Tag hinzufügen</DialogTitle>
        <DialogDescription className="sr-only">
          Vorhandenes Tag auswählen oder ein neues eingeben und mit Enter
          übernehmen. Mit den Pfeiltasten durch die Vorschläge gehen.
        </DialogDescription>
        <div className="flex items-center gap-2">
          <input
            // The dialog focuses its first field: the keyboard opens at once
            autoFocus
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            enterKeyHint="done"
            autoComplete="off"
            aria-label="Tag suchen oder neu eingeben"
            placeholder="Tag eingeben..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, options.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, -1))
              } else if (e.key === "Enter") {
                e.preventDefault()
                const chosen = options[active]?.tag ?? typed
                if (chosen) add(chosen)
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Schließen"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Vorschläge"
          className="-mx-1 flex-1 overflow-y-auto sm:flex-none"
        >
          {options.map((option, index) => (
            // Keyboard use goes through the input (arrow keys and Enter),
            // as the combobox pattern intends; the rows only need taps
            // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled by the combobox input
            <div
              key={option.isNew ? "new" : option.tag}
              id={optionId(index)}
              role="option"
              tabIndex={-1}
              aria-selected={index === active}
              // Keep the focus in the input, so typing can go on
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => add(option.tag)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-3",
                index === active && "bg-muted",
              )}
            >
              {option.isNew ? (
                <>
                  <PlusIcon className="h-4 w-4 flex-shrink-0" />
                  <span>
                    „{option.tag}“{" "}
                    <span className="text-muted-foreground">neu</span>
                  </span>
                </>
              ) : (
                <>
                  <TagIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  {option.tag}
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
