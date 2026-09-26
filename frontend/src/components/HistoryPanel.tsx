import { formatNumber } from '../calculator/format'
import type { HistoryEntry } from '../history/history'

interface HistoryPanelProps {
  id: string
  entries: readonly HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClear: () => void
  /** Disables picking an entry, e.g. while a calculation is in flight. */
  disabled?: boolean
  className?: string
}

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-sezzle-orange focus-visible:outline-none'

/** Entries appear one after another, but never more than ~160ms in total. */
const STAGGER_MS = 20
const MAX_STAGGERED = 8

function staggerDelay(index: number): string {
  return `${Math.min(index, MAX_STAGGERED) * STAGGER_MS}ms`
}

/**
 * Lists past calculations, newest first; picking one restores it. The content
 * is absolutely positioned, so the panel never grows its grid area: it takes
 * the size of the area it is placed in (the keypad on mobile, a full-height
 * column on desktop) and scrolls inside it.
 */
export function HistoryPanel({ id, entries, onSelect, onClear, disabled = false, className = '' }: HistoryPanelProps) {
  const newestFirst = [...entries].reverse()

  return (
    <div id={id} role="region" aria-label="History" className={className}>
      {/* In-flow wrapper, so padding set on the region applies to the content. */}
      <div className="relative h-full">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-purple-200/80 uppercase">History</h2>
            <button
              type="button"
              onClick={onClear}
              disabled={entries.length === 0}
              aria-label="Clear history"
              className={[
                'rounded-full px-3 py-1 text-sm font-medium text-sezzle-coral transition duration-150 ease-out',
                'motion-safe:active:scale-95 [-webkit-tap-highlight-color:transparent]',
                'hover:bg-sezzle-coral/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                FOCUS_RING,
              ].join(' ')}
            >
              Clear
            </button>
          </div>

          {newestFirst.length === 0 ? (
            <p className="m-auto text-sm text-purple-200/50">No calculations yet</p>
          ) : (
            <ol className="-mx-2 flex-1 space-y-1 overflow-y-auto px-2 py-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]">
              {newestFirst.map((entry, index) => {
                const result = formatNumber(entry.result)
                return (
                  <li
                    key={entries.length - index}
                    className="motion-safe:animate-item-in"
                    style={{ animationDelay: staggerDelay(index) }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      disabled={disabled}
                      aria-label={`${entry.expression} ${result}`}
                      className={[
                        'w-full rounded-xl px-3 py-2 text-right transition duration-150 ease-out',
                        'motion-safe:active:scale-[0.98] active:duration-75 [-webkit-tap-highlight-color:transparent]',
                        'hover:bg-white/10 active:bg-white/15',
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:delay-200',
                        FOCUS_RING,
                      ].join(' ')}
                    >
                      <span className="block text-sm break-all text-purple-200/70">{entry.expression}</span>
                      <span className="block text-2xl font-light break-all text-white">{result}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
