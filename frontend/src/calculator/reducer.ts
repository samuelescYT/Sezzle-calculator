import type { Operation } from '../api/calculatorApi'
import { formatEntry, formatNumber } from './format'

/**
 * Pure state machine for a classic "immediate execution" calculator.
 *
 * The reducer never calls the API. When a key needs a calculation it stores a
 * `request` describing the call; the hook performs it and reports back with
 * `requestSucceeded` / `requestFailed`. Operations are evaluated left to right,
 * like a basic calculator: 10 + 10 ^ 2 = 400.
 */

export type BinaryOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export const OPERATOR_SYMBOLS: Record<BinaryOperator, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
}

/** Maximum digits the user can type into a single number. */
export const MAX_DIGITS = 15

/**
 * - typing:   the user is typing the entry; it is shown as typed.
 * - value:    the entry is a computed value (initial 0, result, % or √).
 * - awaiting: an operator was just pressed; the entry still shows the left
 *             operand but is not a new operand yet.
 */
type EntryState = 'typing' | 'value' | 'awaiting'

interface PendingOperation {
  operand: number
  operator: BinaryOperator
}

/** What to do with the result once the API answers. */
type Continuation =
  /** Carry the result forward as the left operand of `operator`. */
  | { type: 'chain'; operator: BinaryOperator }
  /** The result is final: show it and explain it with `trace`. */
  | { type: 'resolve'; trace: string }
  /** The result replaces the entry (√); any pending operation stays pending. */
  | { type: 'unary'; trace: string }
  /** The result (a percentage) becomes the right operand of `pending`, which is resolved next. */
  | { type: 'resolvePending'; pending: PendingOperation; trace: string }

export interface CalculationRequest {
  id: number
  operation: Operation
  a: number
  b?: number
  then: Continuation
}

export interface CalculatorState {
  entry: string
  entryState: EntryState
  pending: PendingOperation | null
  /**
   * Explains the last completed step (e.g. "√9", "20% =", "80 + 20% =") so a
   * value that changed instantly stays understandable. Cleared by the next
   * digit, operator or sign change.
   */
  trace: string | null
  request: CalculationRequest | null
  requestCount: number
  error: string | null
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'operator'; operator: BinaryOperator }
  | { type: 'percent' }
  | { type: 'sqrt' }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'requestSucceeded'; id: number; result: number }
  | { type: 'requestFailed'; id: number; message: string }

type InputAction = Exclude<CalculatorAction, { type: 'clear' | 'requestSucceeded' | 'requestFailed' }>

export const initialState: CalculatorState = {
  entry: '0',
  entryState: 'value',
  pending: null,
  trace: null,
  request: null,
  requestCount: 0,
  error: null,
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return reset(state)
    case 'requestSucceeded':
      return state.request?.id === action.id ? applyResult(state, state.request, action.result) : state
    case 'requestFailed':
      return state.request?.id === action.id ? { ...reset(state), error: action.message } : state
  }

  // Keys are ignored while a calculation is in flight (except clear).
  if (state.request) return state

  // Any key after an error starts over.
  return handleInput(state.error ? reset(state) : state, action)
}

/** Text for the main display line. */
export function displayValue(state: CalculatorState): string {
  if (state.error) return state.error
  return state.entryState === 'typing' ? formatEntry(state.entry) : formatNumber(Number(state.entry))
}

/**
 * Text for the small line above the result: the pending operation followed by
 * the trace of the last step, e.g. "9 +" + "√16" → "9 + √16".
 */
export function expressionLine(state: CalculatorState): string {
  const pending = state.pending ? describe(state.pending) : ''
  return [pending, state.trace ?? ''].filter(Boolean).join(' ')
}

/** The operator waiting for its second operand, highlighted on the keypad. */
export function activeOperator(state: CalculatorState): BinaryOperator | null {
  return state.entryState === 'awaiting' ? (state.pending?.operator ?? null) : null
}

function handleInput(state: CalculatorState, action: InputAction): CalculatorState {
  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit)
    case 'decimal':
      return inputDecimal(state)
    case 'toggleSign':
      return toggleSign(state)
    case 'backspace':
      return backspace(state)
    case 'operator':
      return pressOperator(state, action.operator)
    case 'equals':
      return pressEquals(state)
    case 'percent':
      return pressPercent(state)
    case 'sqrt':
      return pressSqrt(state)
  }
}

function reset(state: CalculatorState): CalculatorState {
  // requestCount survives so late responses from a cleared request are ignored.
  return { ...initialState, requestCount: state.requestCount }
}

function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.entryState !== 'typing') return startEntry(state, digit)
  if (state.entry === '0') return { ...state, entry: digit }
  if (state.entry === '-0') return { ...state, entry: `-${digit}` }
  if (countDigits(state.entry) >= MAX_DIGITS) return state
  return { ...state, entry: state.entry + digit }
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.entryState !== 'typing') return startEntry(state, '0.')
  if (state.entry.includes('.')) return state
  return { ...state, entry: `${state.entry}.` }
}

function toggleSign(state: CalculatorState): CalculatorState {
  // With no operand to negate yet, start typing a negative number.
  if (state.entryState === 'awaiting' || (state.entryState === 'value' && entryValue(state) === 0)) {
    return startEntry(state, '-0')
  }
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`
  // The value no longer matches the trace that explained it.
  return { ...state, entry, trace: null }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.entryState !== 'typing') return state
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? '0' : entry }
}

function pressOperator(state: CalculatorState, operator: BinaryOperator): CalculatorState {
  const { pending } = state

  // Two operators in a row: the last one wins.
  if (pending && state.entryState === 'awaiting') {
    return { ...state, pending: { ...pending, operator } }
  }

  // A pending operation with a new operand: compute it, then continue with `operator`.
  if (pending) {
    return startRequest(state, {
      operation: pending.operator,
      a: pending.operand,
      b: entryValue(state),
      then: { type: 'chain', operator },
    })
  }

  const operand = entryValue(state)
  return { ...state, pending: { operand, operator }, entry: String(operand), entryState: 'awaiting', trace: null }
}

function pressEquals(state: CalculatorState): CalculatorState {
  const { pending } = state
  if (!pending) return state

  // Trailing operator (e.g. "5 + ="): drop it and keep the left operand.
  if (state.entryState === 'awaiting') {
    return {
      ...state,
      pending: null,
      entry: String(pending.operand),
      entryState: 'value',
      trace: `${formatNumber(pending.operand)} =`,
    }
  }

  return startRequest(state, {
    operation: pending.operator,
    a: pending.operand,
    b: entryValue(state),
    then: { type: 'resolve', trace: `${describe(pending)} ${operandLabel(state)} =` },
  })
}

/**
 * Apple-style percentage. After + or − it is a percentage of the left operand
 * (80 + 20% → 80 + 16), otherwise a plain fraction (80 × 20% → 80 × 0.2). A
 * pending operation is resolved right away: 80 + 20% shows 96.
 */
function pressPercent(state: CalculatorState): CalculatorState {
  const { pending } = state
  const value = entryValue(state)
  const percent = `${formatNumber(value)}%`

  if (!pending) {
    return startRequest(state, {
      operation: 'percentage',
      a: value,
      b: 1,
      then: { type: 'resolve', trace: `${percent} =` },
    })
  }

  const isRelative = pending.operator === 'add' || pending.operator === 'subtract'
  return startRequest(state, {
    operation: 'percentage',
    a: value,
    b: isRelative ? pending.operand : 1,
    then: { type: 'resolvePending', pending, trace: `${describe(pending)} ${percent} =` },
  })
}

function pressSqrt(state: CalculatorState): CalculatorState {
  const value = entryValue(state)
  return startRequest(state, {
    operation: 'sqrt',
    a: value,
    then: { type: 'unary', trace: `√${formatNumber(value)}` },
  })
}

function applyResult(state: CalculatorState, request: CalculationRequest, result: number): CalculatorState {
  const { then } = request
  const next: CalculatorState = { ...state, request: null, entry: String(result) }

  switch (then.type) {
    case 'chain':
      return {
        ...next,
        pending: { operand: result, operator: then.operator },
        entryState: 'awaiting',
        trace: null,
      }
    case 'resolve':
      return { ...next, pending: null, entryState: 'value', trace: then.trace }
    case 'unary':
      return { ...next, entryState: 'value', trace: then.trace }
    case 'resolvePending':
      // Second step of "80 + 20%": apply the pending operation to the percentage.
      return startRequest(
        { ...state, request: null },
        {
          operation: then.pending.operator,
          a: then.pending.operand,
          b: result,
          then: { type: 'resolve', trace: then.trace },
        },
      )
  }
}

function startRequest(state: CalculatorState, request: Omit<CalculationRequest, 'id'>): CalculatorState {
  const id = state.requestCount + 1
  return { ...state, requestCount: id, request: { id, ...request } }
}

/** Starts typing a new number, clearing the trace of the previous step. */
function startEntry(state: CalculatorState, entry: string): CalculatorState {
  return { ...state, entry, entryState: 'typing', trace: null }
}

/**
 * How the right operand is written in the final trace: its unary trace when it
 * came from √ (e.g. "9 + √16 ="), otherwise the number itself.
 */
function operandLabel(state: CalculatorState): string {
  return state.trace ?? formatNumber(entryValue(state))
}

function entryValue(state: CalculatorState): number {
  return Number(state.entry)
}

function countDigits(entry: string): number {
  return entry.replace(/\D/g, '').length
}

function describe({ operand, operator }: PendingOperation): string {
  return `${formatNumber(operand)} ${OPERATOR_SYMBOLS[operator]}`
}
