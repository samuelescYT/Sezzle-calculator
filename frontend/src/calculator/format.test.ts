import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/calculatorApi'
import { formatEntry, formatError, formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [42, '42'],
    [-42, '-42'],
    [2.5, '2.5'],
    [1234567.891, '1,234,567.891'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333333'],
    [999999999999999, '999,999,999,999,999'],
    [0.0000001, '0.0000001'],
    [1e15, '1e+15'],
    [1e21, '1e+21'],
    [-1.5e20, '-1.5e+20'],
    [2e-10, '2e-10'],
    [Infinity, 'Error'],
    [NaN, 'Error'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('formatEntry', () => {
  it.each([
    ['0', '0'],
    ['123', '123'],
    ['1234', '1,234'],
    ['-1234567', '-1,234,567'],
    ['1234.5678', '1,234.5678'],
    ['0.', '0.'],
    ['1000.00', '1,000.00'],
    ['-0', '-0'],
  ])('formats %s as %s', (entry, expected) => {
    expect(formatEntry(entry)).toBe(expected)
  })
})

describe('formatError', () => {
  it.each([
    ['DIVISION_BY_ZERO', 'Cannot divide by zero'],
    ['NEGATIVE_SQUARE_ROOT', 'Invalid input'],
    ['UNDEFINED_RESULT', 'Undefined result'],
    ['RESULT_OUT_OF_RANGE', 'Result too large'],
    ['NETWORK_ERROR', 'Service unavailable'],
    ['INVALID_INPUT', 'Something went wrong'],
  ])('maps %s to "%s"', (code, expected) => {
    expect(formatError(new ApiError(code, 'details'))).toBe(expected)
  })

  it('handles non-API errors', () => {
    expect(formatError(new Error('boom'))).toBe('Something went wrong')
    expect(formatError('boom')).toBe('Something went wrong')
  })
})
