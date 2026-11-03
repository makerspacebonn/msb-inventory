import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

// The list of labels for the next label sheet. It's kept in the browser,
// so it survives navigating around while collecting items and locations.

export type LabelEntryKind = "item" | "location"

export type LabelEntry = {
  kind: LabelEntryKind
  id: number
  name: string
  copies: number
}

type StoredState = { collecting: boolean; entries: LabelEntry[] }

type LabelSheetContextValue = StoredState & {
  /** Number of labels, counting copies */
  labelCount: number
  has: (kind: LabelEntryKind, id: number) => boolean
  /** Adds entries that aren't on the list yet */
  add: (entries: Omit<LabelEntry, "copies">[]) => void
  remove: (kind: LabelEntryKind, id: number) => void
  setCopies: (kind: LabelEntryKind, id: number, copies: number) => void
  clear: () => void
  /** While collecting, item and location pages offer adding them */
  setCollecting: (collecting: boolean) => void
}

const STORAGE_KEY = "msb-label-sheet"
const EMPTY: StoredState = { collecting: false, entries: [] }

function load(): StoredState {
  if (typeof window === "undefined") return EMPTY
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (stored && Array.isArray(stored.entries)) {
      return { collecting: !!stored.collecting, entries: stored.entries }
    }
  } catch {
    // Unreadable storage: start with an empty list
  }
  return EMPTY
}

const same = (kind: LabelEntryKind, id: number) => (entry: LabelEntry) =>
  entry.kind === kind && entry.id === id

const LabelSheetContext = createContext<LabelSheetContextValue | null>(null)

export function LabelSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(EMPTY)
  const [isLoaded, setIsLoaded] = useState(false)

  // Loaded after the first render, so server and client render the same
  useEffect(() => {
    setState(load())
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked: the list just isn't remembered
    }
  }, [state, isLoaded])

  const has = useCallback(
    (kind: LabelEntryKind, id: number) => state.entries.some(same(kind, id)),
    [state.entries],
  )

  const add = useCallback((entries: Omit<LabelEntry, "copies">[]) => {
    setState((prev) => {
      const fresh = entries.filter(
        (entry) => !prev.entries.some(same(entry.kind, entry.id)),
      )
      return {
        ...prev,
        entries: [
          ...prev.entries,
          ...fresh.map((entry) => ({ ...entry, copies: 1 })),
        ],
      }
    })
  }, [])

  const remove = useCallback((kind: LabelEntryKind, id: number) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((entry) => !same(kind, id)(entry)),
    }))
  }, [])

  const setCopies = useCallback(
    (kind: LabelEntryKind, id: number, copies: number) => {
      const valid = Math.min(99, Math.max(1, Math.round(copies) || 1))
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((entry) =>
          same(kind, id)(entry) ? { ...entry, copies: valid } : entry,
        ),
      }))
    },
    [],
  )

  const clear = useCallback(() => setState(EMPTY), [])

  const setCollecting = useCallback((collecting: boolean) => {
    setState((prev) => ({ ...prev, collecting }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      labelCount: state.entries.reduce((sum, entry) => sum + entry.copies, 0),
      has,
      add,
      remove,
      setCopies,
      clear,
      setCollecting,
    }),
    [state, has, add, remove, setCopies, clear, setCollecting],
  )

  return (
    <LabelSheetContext.Provider value={value}>
      {children}
    </LabelSheetContext.Provider>
  )
}

export function useLabelSheet() {
  const context = useContext(LabelSheetContext)
  if (!context) {
    throw new Error("useLabelSheet must be used within LabelSheetProvider")
  }
  return context
}
