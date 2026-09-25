import { useCalculator } from '../hooks/useCalculator'
import { Display } from './Display'
import { Keypad } from './Keypad'

export function Calculator() {
  const { dispatch, expression, display, isError, isBusy, activeOperator } = useCalculator()

  return (
    <section
      aria-label="Calculator"
      aria-busy={isBusy}
      className="w-full max-w-sm rounded-3xl bg-slate-900 p-5 shadow-2xl ring-1 ring-white/10"
    >
      <Display expression={expression} value={display} isError={isError} />
      <Keypad onPress={dispatch} disabled={isBusy} activeOperator={activeOperator} />
    </section>
  )
}
