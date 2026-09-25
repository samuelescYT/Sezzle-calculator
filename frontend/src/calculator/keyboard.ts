import type { BinaryOperator, CalculatorAction, Digit } from './reducer'

const OPERATOR_KEYS: Record<string, BinaryOperator> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
}

const COMMAND_KEYS: Record<string, CalculatorAction> = {
  '.': { type: 'decimal' },
  '%': { type: 'percent' },
  '=': { type: 'equals' },
  Enter: { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  Delete: { type: 'clear' },
}

/** Maps a KeyboardEvent.key to a calculator action, or null if unhandled. */
export function keyToAction(key: string): CalculatorAction | null {
  if (/^\d$/.test(key)) return { type: 'digit', digit: key as Digit }
  if (key in OPERATOR_KEYS) return { type: 'operator', operator: OPERATOR_KEYS[key] }
  return COMMAND_KEYS[key] ?? null
}
