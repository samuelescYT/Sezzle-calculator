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
  | { type: 'chain'; operator: BinaryOperator }
  | { type: 'equals'; expression: string }
  | { type: 'replaceEntry' }

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
  expression: string
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
  expression: '',
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
      return startRequest(state, {
        operation: 'percentage',
        a: entryValue(state),
        b: percentBase(state.pending),
        then: { type: 'replaceEntry' },
      })
    case 'sqrt':
      return startRequest(state, { operation: 'sqrt', a: entryValue(state), then: { type: 'replaceEntry' } })
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
  return { ...state, entry }
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
    return { ...state, pending: { ...pending, operator }, expression: describe(pending.operand, operator) }
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
  return {
    ...state,
    pending: { operand, operator },
    entry: String(operand),
    entryState: 'awaiting',
    expression: describe(operand, operator),
  }
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
      expression: `${formatNumber(pending.operand)} =`,
    }
  }

  const operand = entryValue(state)
  return startRequest(state, {
    operation: pending.operator,
    a: pending.operand,
    b: operand,
    then: { type: 'equals', expression: `${describe(pending.operand, pending.operator)} ${formatNumber(operand)} =` },
  })
}

function applyResult(state: CalculatorState, request: CalculationRequest, result: number): CalculatorState {
  const next: CalculatorState = { ...state, request: null, entry: String(result) }
  switch (request.then.type) {
    case 'chain': {
      const { operator } = request.then
      return {
        ...next,
        pending: { operand: result, operator },
        entryState: 'awaiting',
        expression: describe(result, operator),
      }
    }
    case 'equals':
      return { ...next, pending: null, entryState: 'value', expression: request.then.expression }
    case 'replaceEntry':
      return { ...next, entryState: 'value' }
  }
}

function startRequest(state: CalculatorState, request: Omit<CalculationRequest, 'id'>): CalculatorState {
  const id = state.requestCount + 1
  return { ...state, requestCount: id, request: { id, ...request } }
}

/** Starts typing a new number; clears the old expression if nothing is pending. */
function startEntry(state: CalculatorState, entry: string): CalculatorState {
  return { ...state, entry, entryState: 'typing', expression: state.pending ? state.expression : '' }
}

/**
 * Apple-style percentage: after + or − it is a percentage of the left operand
 * (60 − 30% → 60 − 18); otherwise it is a plain fraction (30% → 0.3).
 */
function percentBase(pending: PendingOperation | null): number {
  if (pending && (pending.operator === 'add' || pending.operator === 'subtract')) return pending.operand
  return 1
}

function entryValue(state: CalculatorState): number {
  return Number(state.entry)
}

function countDigits(entry: string): number {
  return entry.replace(/\D/g, '').length
}

function describe(operand: number, operator: BinaryOperator): string {
  return `${formatNumber(operand)} ${OPERATOR_SYMBOLS[operator]}`
}
