import { describe, expect, it } from 'vitest'
import {
  activeOperator,
  calculatorReducer,
  displayValue,
  expressionLine,
  initialState,
  MAX_DIGITS,
  type BinaryOperator,
  type CalculatorAction,
  type CalculatorState,
  type Digit,
} from './reducer'

const OPERATOR_KEYS: Record<string, BinaryOperator> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
}

/** Translates a compact key string such as "12.5+3=" into actions. */
function keys(sequence: string): CalculatorAction[] {
  return [...sequence].map((key): CalculatorAction => {
    if (/\d/.test(key)) return { type: 'digit', digit: key as Digit }
    if (key in OPERATOR_KEYS) return { type: 'operator', operator: OPERATOR_KEYS[key] }
    switch (key) {
      case '.':
        return { type: 'decimal' }
      case '=':
        return { type: 'equals' }
      case '%':
        return { type: 'percent' }
      case 'r':
        return { type: 'sqrt' }
      case 'n':
        return { type: 'toggleSign' }
      case '<':
        return { type: 'backspace' }
      case 'c':
        return { type: 'clear' }
    }
    throw new Error(`unknown key ${key}`)
  })
}

function press(sequence: string, state: CalculatorState = initialState): CalculatorState {
  return keys(sequence).reduce(calculatorReducer, state)
}

/** Simulates the API answering the in-flight request. */
function resolve(state: CalculatorState, result: number): CalculatorState {
  if (!state.request) throw new Error('no request in flight')
  return calculatorReducer(state, { type: 'requestSucceeded', id: state.request.id, result })
}

function fail(state: CalculatorState, message: string): CalculatorState {
  if (!state.request) throw new Error('no request in flight')
  return calculatorReducer(state, { type: 'requestFailed', id: state.request.id, message })
}

function requestOf(state: CalculatorState) {
  return state.request && { operation: state.request.operation, a: state.request.a, b: state.request.b }
}

describe('initial state', () => {
  it('shows 0 and an empty expression line', () => {
    expect(displayValue(initialState)).toBe('0')
    expect(expressionLine(initialState)).toBe('')
    expect(initialState.trace).toBeNull()
    expect(initialState.request).toBeNull()
  })
})

describe('typing numbers', () => {
  it('appends digits', () => {
    expect(displayValue(press('123'))).toBe('123')
  })

  it('replaces a leading zero', () => {
    expect(press('05').entry).toBe('5')
    expect(press('000').entry).toBe('0')
  })

  it('adds thousands separators while typing', () => {
    expect(displayValue(press('1234567'))).toBe('1,234,567')
  })

  it('accepts a single decimal point', () => {
    expect(displayValue(press('1.5.2'))).toBe('1.52')
  })

  it('starts with "0." when the decimal point comes first', () => {
    expect(displayValue(press('.'))).toBe('0.')
    expect(displayValue(press('.5'))).toBe('0.5')
  })

  it('keeps trailing zeros while typing', () => {
    expect(displayValue(press('0.50'))).toBe('0.50')
  })

  it(`limits input to ${MAX_DIGITS} digits`, () => {
    const state = press('9'.repeat(MAX_DIGITS + 3))
    expect(state.entry).toBe('9'.repeat(MAX_DIGITS))
  })

  it('removes the last character with backspace', () => {
    expect(press('123<').entry).toBe('12')
    expect(press('1.<').entry).toBe('1')
  })

  it('falls back to 0 when backspacing everything', () => {
    expect(press('1<').entry).toBe('0')
    expect(press('n5<').entry).toBe('0')
  })

  it('does not backspace a computed value', () => {
    const result = resolve(press('2+3='), 5)
    expect(press('<', result).entry).toBe('5')
  })
})

describe('toggle sign', () => {
  it('negates and restores the entry', () => {
    expect(press('5n').entry).toBe('-5')
    expect(press('5nn').entry).toBe('5')
  })

  it('starts a negative number from 0', () => {
    expect(displayValue(press('n7'))).toBe('-7')
  })

  it('starts a negative second operand after an operator', () => {
    const state = press('8*n2')
    expect(displayValue(state)).toBe('-2')
    expect(requestOf(press('=', state))).toEqual({ operation: 'multiply', a: 8, b: -2 })
  })

  it('negates a computed result', () => {
    const result = resolve(press('2+3='), 5)
    expect(displayValue(press('n', result))).toBe('-5')
  })
})

describe('binary operations', () => {
  it('shows the pending operation above the entry', () => {
    const state = press('12+')
    expect(expressionLine(state)).toBe('12 +')
    expect(displayValue(state)).toBe('12')
    expect(state.request).toBeNull()
  })

  it('requests the operation on equals and traces the full expression', () => {
    const pending = press('12+3=')
    expect(requestOf(pending)).toEqual({ operation: 'add', a: 12, b: 3 })

    const done = resolve(pending, 15)
    expect(displayValue(done)).toBe('15')
    expect(done.trace).toBe('12 + 3 =')
    expect(expressionLine(done)).toBe('12 + 3 =')
    expect(done.pending).toBeNull()
    expect(done.request).toBeNull()
  })

  it.each([
    ['-', 'subtract', '−'],
    ['*', 'multiply', '×'],
    ['/', 'divide', '÷'],
    ['^', 'power', '^'],
  ])('maps %s to the %s operation', (key, operation, symbol) => {
    const state = press(`6${key}`)
    expect(expressionLine(state)).toBe(`6 ${symbol}`)
    expect(requestOf(press('2=', state))).toEqual({ operation, a: 6, b: 2 })
  })

  it('replaces the operator when two are pressed in a row', () => {
    const state = press('5+*')
    expect(expressionLine(state)).toBe('5 ×')
    expect(state.request).toBeNull()
    expect(requestOf(press('3=', state))).toEqual({ operation: 'multiply', a: 5, b: 3 })
  })

  it('evaluates chained operations left to right', () => {
    let state = press('10+10^')
    expect(requestOf(state)).toEqual({ operation: 'add', a: 10, b: 10 })

    state = resolve(state, 20)
    expect(expressionLine(state)).toBe('20 ^')
    expect(displayValue(state)).toBe('20')

    state = press('2=', state)
    expect(requestOf(state)).toEqual({ operation: 'power', a: 20, b: 2 })
    expect(displayValue(resolve(state, 400))).toBe('400')
  })

  it('drops a trailing operator on equals', () => {
    const state = press('5+=')
    expect(state.request).toBeNull()
    expect(displayValue(state)).toBe('5')
    expect(expressionLine(state)).toBe('5 =')
  })

  it('ignores equals when nothing is pending', () => {
    const state = press('5')
    expect(press('=', state)).toBe(state)
  })

  it('uses 0 when an operator is pressed first', () => {
    expect(requestOf(press('+5='))).toEqual({ operation: 'add', a: 0, b: 5 })
  })

  it('normalizes a trailing decimal point in the operand', () => {
    const state = press('5.+')
    expect(displayValue(state)).toBe('5')
    expect(state.pending?.operand).toBe(5)
  })

  it('starts a new calculation when typing after a result', () => {
    const state = press('7', resolve(press('12+3='), 15))
    expect(displayValue(state)).toBe('7')
    expect(expressionLine(state)).toBe('')
  })

  it('continues from the result when an operator follows it', () => {
    const state = press('*', resolve(press('12+3='), 15))
    expect(expressionLine(state)).toBe('15 ×')
    expect(requestOf(press('2=', state))).toEqual({ operation: 'multiply', a: 15, b: 2 })
  })

  it('formats long results', () => {
    const state = resolve(press('1/3='), 0.3333333333333333)
    expect(displayValue(state)).toBe('0.333333333333333')
    expect(expressionLine(state)).toBe('1 ÷ 3 =')
  })
})

describe('percentage', () => {
  it('is a plain fraction with nothing pending, traced as "x% ="', () => {
    const state = press('20%')
    expect(requestOf(state)).toEqual({ operation: 'percentage', a: 20, b: 1 })

    const done = resolve(state, 0.2)
    expect(displayValue(done)).toBe('0.2')
    expect(expressionLine(done)).toBe('20% =')
  })

  it('resolves a pending addition immediately: 80 + 20% = 96', () => {
    let state = press('80+20%')
    expect(requestOf(state)).toEqual({ operation: 'percentage', a: 20, b: 80 })

    // The percentage result feeds straight into the pending addition.
    state = resolve(state, 16)
    expect(requestOf(state)).toEqual({ operation: 'add', a: 80, b: 16 })

    state = resolve(state, 96)
    expect(state.request).toBeNull()
    expect(state.pending).toBeNull()
    expect(displayValue(state)).toBe('96')
    expect(expressionLine(state)).toBe('80 + 20% =')
  })

  it('resolves a pending subtraction immediately: 60 − 30% = 42', () => {
    let state = press('60-30%')
    expect(requestOf(state)).toEqual({ operation: 'percentage', a: 30, b: 60 })

    state = resolve(state, 18)
    expect(requestOf(state)).toEqual({ operation: 'subtract', a: 60, b: 18 })

    state = resolve(state, 42)
    expect(displayValue(state)).toBe('42')
    expect(expressionLine(state)).toBe('60 − 30% =')
  })

  it.each([
    ['*', 'multiply', '×'],
    ['/', 'divide', '÷'],
    ['^', 'power', '^'],
  ])('uses a plain fraction after %s and resolves the %s', (key, operation, symbol) => {
    let state = press(`80${key}20%`)
    expect(requestOf(state)).toEqual({ operation: 'percentage', a: 20, b: 1 })

    state = resolve(state, 0.2)
    expect(requestOf(state)).toEqual({ operation, a: 80, b: 0.2 })

    state = resolve(state, 16)
    expect(expressionLine(state)).toBe(`80 ${symbol} 20% =`)
  })

  it('uses the left operand when pressed right after an operator', () => {
    const state = press('80+%')
    expect(requestOf(state)).toEqual({ operation: 'percentage', a: 80, b: 80 })
    expect(expressionLine(resolve(resolve(state, 64), 144))).toBe('80 + 80% =')
  })

  it('keeps the keypad busy between the two requests', () => {
    const between = resolve(press('80+20%'), 16)
    expect(between.request).not.toBeNull()
    expect(press('5', between)).toBe(between)
  })

  it('starts a new number when typing after the result', () => {
    const state = press('4', resolve(resolve(press('80+20%'), 16), 96))
    expect(displayValue(state)).toBe('4')
    expect(expressionLine(state)).toBe('')
  })

  it('continues from the result when an operator follows', () => {
    const state = press('-', resolve(resolve(press('80+20%'), 16), 96))
    expect(expressionLine(state)).toBe('96 −')
  })

  it('shows an error if the second request fails', () => {
    const state = fail(resolve(press('80/0%'), 0), 'Cannot divide by zero')
    expect(displayValue(state)).toBe('Cannot divide by zero')
    expect(expressionLine(state)).toBe('')
  })
})

describe('square root', () => {
  it('requests sqrt of the entry and traces it', () => {
    const state = press('9r')
    expect(requestOf(state)).toEqual({ operation: 'sqrt', a: 9, b: undefined })

    const done = resolve(state, 3)
    expect(displayValue(done)).toBe('3')
    expect(expressionLine(done)).toBe('√9')
  })

  it('keeps the pending operation and shows the trace after it', () => {
    const state = resolve(press('9+16r'), 4)
    expect(displayValue(state)).toBe('4')
    expect(expressionLine(state)).toBe('9 + √16')
  })

  it('uses the square root trace in the final expression', () => {
    let state = press('=', resolve(press('9+16r'), 4))
    expect(requestOf(state)).toEqual({ operation: 'add', a: 9, b: 4 })

    state = resolve(state, 13)
    expect(displayValue(state)).toBe('13')
    expect(expressionLine(state)).toBe('9 + √16 =')
  })

  it('traces a square root of a previous square root by its value', () => {
    const state = resolve(press('r', resolve(press('16r'), 4)), 2)
    expect(expressionLine(state)).toBe('√4')
  })
})

describe('trace', () => {
  const afterSqrt = () => resolve(press('9r'), 3)

  it('clears on the next digit', () => {
    const state = press('5', afterSqrt())
    expect(state.trace).toBeNull()
    expect(expressionLine(state)).toBe('')
  })

  it('clears on the decimal point', () => {
    expect(press('.', afterSqrt()).trace).toBeNull()
  })

  it('clears on an operator and shows the pending operation instead', () => {
    const state = press('+', afterSqrt())
    expect(state.trace).toBeNull()
    expect(expressionLine(state)).toBe('3 +')
  })

  it('clears when the sign of the traced value changes', () => {
    const state = press('n', afterSqrt())
    expect(displayValue(state)).toBe('-3')
    expect(state.trace).toBeNull()
  })

  it('does not label the operand with a trace it no longer matches', () => {
    const state = press('n=', resolve(press('9+16r'), 4))
    expect(requestOf(state)).toEqual({ operation: 'add', a: 9, b: -4 })
    expect(expressionLine(resolve(state, 5))).toBe('9 + -4 =')
  })

  it('clears on all clear', () => {
    expect(press('c', afterSqrt()).trace).toBeNull()
  })
})

describe('requests in flight', () => {
  it('ignores input until the response arrives', () => {
    const state = press('2+3=')
    expect(press('45*', state)).toBe(state)
  })

  it('gives each request a new id', () => {
    const first = press('2+3=')
    const second = press('+1=', resolve(first, 5))
    expect(second.request?.id).toBeGreaterThan(first.request?.id ?? Infinity)
  })

  it('clears state and discards the in-flight request on clear', () => {
    const inFlight = press('2+3=')
    const cleared = press('c', inFlight)
    expect(cleared.request).toBeNull()
    expect(displayValue(cleared)).toBe('0')

    const late = calculatorReducer(cleared, { type: 'requestSucceeded', id: inFlight.request!.id, result: 5 })
    expect(late).toBe(cleared)
  })

  it('ignores a failure for a request that is no longer current', () => {
    const cleared = press('c', press('8/0='))
    const late = calculatorReducer(cleared, { type: 'requestFailed', id: 1, message: 'Cannot divide by zero' })
    expect(late).toBe(cleared)
  })
})

describe('errors', () => {
  it('shows the error message and resets the calculation', () => {
    const state = fail(press('8/0='), 'Cannot divide by zero')
    expect(displayValue(state)).toBe('Cannot divide by zero')
    expect(state.pending).toBeNull()
    expect(expressionLine(state)).toBe('')
  })

  it('starts over on the next digit', () => {
    const state = press('7', fail(press('8/0='), 'Cannot divide by zero'))
    expect(state.error).toBeNull()
    expect(displayValue(state)).toBe('7')
  })

  it('starts from 0 when an operator follows an error', () => {
    const state = press('+', fail(press('8/0='), 'Cannot divide by zero'))
    expect(expressionLine(state)).toBe('0 +')
  })

  it('clears the error on clear', () => {
    const state = press('c', fail(press('8/0='), 'Cannot divide by zero'))
    expect(state.error).toBeNull()
    expect(displayValue(state)).toBe('0')
  })
})

describe('activeOperator', () => {
  it('is the pending operator while waiting for the second operand', () => {
    expect(activeOperator(press('5+'))).toBe('add')
    expect(activeOperator(press('5+*'))).toBe('multiply')
  })

  it('is null once the second operand is being typed', () => {
    expect(activeOperator(press('5+3'))).toBeNull()
  })

  it('is null with nothing pending', () => {
    expect(activeOperator(initialState)).toBeNull()
  })
})
