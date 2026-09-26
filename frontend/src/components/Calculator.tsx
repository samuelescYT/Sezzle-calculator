import { useState } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { useHistory } from '../hooks/useHistory'
import { Display } from './Display'
import { HistoryPanel } from './HistoryPanel'
import { HistoryToggle } from './HistoryToggle'
import { Keypad } from './Keypad'

const HISTORY_PANEL_ID = 'calculator-history'

/**
 * Layout is one grid:
 * - mobile: display on top, keypad below; the history panel shares the keypad's
 *   cell and covers it while the display stays visible.
 * - desktop (md+): the card widens and the history panel becomes a second
 *   column next to an unchanged calculator column.
 */
export function Calculator() {
  const history = useHistory()
  const { dispatch, expression, display, isError, isBusy, activeOperator } = useCalculator({
    onCalculated: history.add,
  })
  const [isHistoryOpen, setHistoryOpen] = useState(false)

  return (
    <section
      aria-label="Calculator"
      aria-busy={isBusy}
      className={[
        'w-full max-w-sm rounded-3xl bg-sezzle-plum p-5 shadow-2xl shadow-black/50 ring-1 ring-white/10',
        isHistoryOpen ? 'md:max-w-[43.5rem]' : '',
      ].join(' ')}
    >
      <h1 className="flex justify-center pt-1 pb-3">
        <img src="/sezzle-logo.svg" alt="Sezzle" className="h-6 sm:h-7 md:h-8" />
        <span className="sr-only"> Calculator</span>
      </h1>

      <div className={`grid grid-cols-1 ${isHistoryOpen ? 'md:grid-cols-[21.5rem_1fr] md:gap-x-6' : ''}`}>
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
            onClear={history.clear}
            className={[
              // Mobile: an opaque overlay on top of the keypad.
              'z-10 col-start-1 row-start-2 bg-sezzle-plum',
              // Desktop: a full-height side column with a subtle divider.
              'md:col-start-2 md:row-span-2 md:row-start-1 md:border-l md:border-white/10 md:pl-6',
            ].join(' ')}
          />
        )}
      </div>
    </section>
  )
}
