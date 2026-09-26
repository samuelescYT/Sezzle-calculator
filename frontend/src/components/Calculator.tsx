import { useState } from 'react'
import type { HistoryEntry } from '../history/history'
import { useCalculator } from '../hooks/useCalculator'
import { useHistory } from '../hooks/useHistory'
import { Display } from './Display'
import { HistoryPanel } from './HistoryPanel'
import { HistoryToggle } from './HistoryToggle'
import { Keypad } from './Keypad'

const HISTORY_PANEL_ID = 'calculator-history'

/** Matches Tailwind's `md` breakpoint, where history sits beside the keypad instead of over it. */
const SIDE_BY_SIDE_QUERY = '(min-width: 48rem)'

function isSideBySide(): boolean {
  return window.matchMedia?.(SIDE_BY_SIDE_QUERY).matches ?? false
}

/**
 * Sizing: full screen on phones; from `sm` a rounded card whose height is
 * capped by the viewport, so it never needs scrolling on short laptop screens.
 * The display takes the remaining height and the keypad rows flex between
 * 15rem and 28rem.
 *
 * Layout is one grid:
 * - below `md`: display on top, keypad below; the history panel shares the
 *   keypad's cell and covers it while the display stays visible.
 * - `md` and up: the card widens and the history panel becomes a second column
 *   next to an unchanged calculator column.
 */
export function Calculator() {
  const history = useHistory()
  const { dispatch, expression, display, isError, isBusy, activeOperator } = useCalculator({
    onCalculated: history.add,
  })
  const [isHistoryOpen, setHistoryOpen] = useState(false)

  function restore(entry: HistoryEntry) {
    dispatch({ type: 'restore', expression: entry.expression, result: entry.result })
    // The overlay hides the keypad on smaller screens: get it out of the way.
    if (!isSideBySide()) setHistoryOpen(false)
  }

  return (
    <section
      aria-label="Calculator"
      aria-busy={isBusy}
      className={[
        'flex h-dvh w-full flex-col bg-sezzle-plum p-4',
        // From sm the card is translucent, letting the brand glow through. It must not use
        // backdrop-filter itself, or the history panel's blur could no longer see the glow.
        'sm:h-[min(42rem,calc(100dvh-2rem))] sm:min-h-[32rem] sm:max-w-sm sm:rounded-3xl sm:bg-sezzle-plum/60 sm:p-5',
        'sm:shadow-2xl sm:ring-1 sm:shadow-black/50 sm:ring-white/10',
        isHistoryOpen ? 'md:max-w-[43.5rem]' : '',
      ].join(' ')}
    >
      <h1 className="flex shrink-0 justify-center pt-1 pb-3">
        <img src="/sezzle-logo.svg" alt="Sezzle Calculator" className="h-6 sm:h-7 md:h-8" />
      </h1>

      <div
        className={[
          'grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(7rem,1fr)_minmax(15rem,28rem)]',
          isHistoryOpen ? 'md:grid-cols-[21.5rem_1fr] md:gap-x-6' : '',
        ].join(' ')}
      >
        <Display
          className="col-start-1 row-start-1"
          expression={expression}
          value={display}
          isError={isError}
          leading={
            <HistoryToggle
              isOpen={isHistoryOpen}
              controls={HISTORY_PANEL_ID}
              onToggle={() => setHistoryOpen((open) => !open)}
            />
          }
        />

        <div className="col-start-1 row-start-2">
          <Keypad onPress={dispatch} disabled={isBusy} activeOperator={activeOperator} />
        </div>

        {isHistoryOpen && (
          <HistoryPanel
            id={HISTORY_PANEL_ID}
            entries={history.entries}
            onSelect={restore}
            onClear={history.clear}
            disabled={isBusy}
            className={[
              // Frosted glass: blurs the keypad underneath on smaller screens and the brand
              // glow (through the translucent card) on wider ones, where it can be lighter.
              'z-10 rounded-2xl border border-white/10 bg-sezzle-plum/60 p-4 backdrop-blur-xl md:bg-sezzle-plum/35',
              // Below md: covers the keypad. md and up: a full-height side column.
              'col-start-1 row-start-2 md:col-start-2 md:row-span-2 md:row-start-1',
            ].join(' ')}
          />
        )}
      </div>
    </section>
  )
}
