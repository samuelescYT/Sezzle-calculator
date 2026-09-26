import { formatNumber } from '../calculator/format'
import type { HistoryEntry } from '../history/history'

interface HistoryPanelProps {
  id: string
  entries: readonly HistoryEntry[]
  onClear: () => void
  className?: string
}

/**
 * Lists past calculations, newest first. The content is absolutely positioned,
 * so the panel never grows its grid area: it takes the size of the area it is
 * placed in (the keypad on mobile, a full-height column on desktop) and
 * scrolls inside it.
 */
export function HistoryPanel({ id, entries, onClear, className = '' }: HistoryPanelProps) {
  const newestFirst = [...entries].reverse()

  return (
    <div id={id} role="region" aria-label="History" className={className}>
      {/* In-flow wrapper, so padding set on the region applies to the content. */}
      <div className="relative h-full">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-semibold tracking-wide text-purple-200/80 uppercase">History</h2>
            <button
              type="button"
              onClick={onClear}
              disabled={entries.length === 0}
              aria-label="Clear history"
              className={[
                'rounded-full px-3 py-1 text-sm font-medium text-sezzle-coral transition',
                'hover:bg-sezzle-coral/10 focus-visible:ring-2 focus-visible:ring-sezzle-orange focus-visible:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
              ].join(' ')}
            >
              Clear
            </button>
          </div>

          {newestFirst.length === 0 ? (
            <p className="m-auto text-sm text-purple-200/50">No calculations yet</p>
          ) : (
            <ol className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
              {newestFirst.map((entry, index) => (
                <li key={entries.length - index} className="text-right">
                  <p className="text-sm break-all text-purple-200/70">{entry.expression}</p>
                  <p className="text-2xl font-light break-all text-white">{formatNumber(entry.result)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
