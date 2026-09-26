import { useCallback, useEffect, useState } from 'react'
import { addEntry, browserStorage, loadHistory, saveHistory, type HistoryEntry } from '../history/history'

/** The last calculations, kept in sync with localStorage. */
export function useHistory(storage: Storage | null = browserStorage()) {
  const [entries, setEntries] = useState(() => loadHistory(storage))

  useEffect(() => {
    saveHistory(storage, entries)
  }, [storage, entries])

  const add = useCallback((entry: HistoryEntry) => setEntries((history) => addEntry(history, entry)), [])
  const clear = useCallback(() => setEntries([]), [])

  return { entries, add, clear }
}
