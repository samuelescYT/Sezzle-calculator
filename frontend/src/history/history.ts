/** A completed calculation, e.g. { expression: "80 + 20% =", result: 96 }. */
export interface HistoryEntry {
  expression: string
  result: number
}

export const HISTORY_LIMIT = 20
export const HISTORY_STORAGE_KEY = 'sezzle-calculator:history'

/** Appends an entry (oldest first), dropping the oldest ones beyond the limit. */
export function addEntry(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...history, entry].slice(-HISTORY_LIMIT)
}

/** The browser's localStorage, or null where it is unavailable (e.g. blocked by privacy settings). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Reads the saved history, ignoring anything missing, corrupt or malformed. */
export function loadHistory(storage: Storage | null): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(HISTORY_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry).slice(-HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

/** Saves the history; an empty history removes the key entirely. */
export function saveHistory(storage: Storage | null, history: readonly HistoryEntry[]): void {
  try {
    if (history.length === 0) storage?.removeItem(HISTORY_STORAGE_KEY)
    else storage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Storage full or blocked: history still works for this session.
  }
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HistoryEntry).expression === 'string' &&
    Number.isFinite((value as HistoryEntry).result)
  )
}
