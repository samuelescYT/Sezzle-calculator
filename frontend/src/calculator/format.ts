import { ApiError } from '../api/calculatorApi'

/** Significant digits shown for results; hides float noise like 0.1 + 0.2. */
export const MAX_SIGNIFICANT_DIGITS = 15

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: MAX_SIGNIFICANT_DIGITS,
})

/** Formats a computed value for display, e.g. 1234.5 → "1,234.5". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error'
  if (value === 0) return '0' // also normalizes -0

  const abs = Math.abs(value)
  if (abs >= 1e15 || abs < 1e-7) {
    return Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS)).toExponential()
  }
  return numberFormat.format(value)
}

/**
 * Formats the raw text being typed, keeping what the user entered
 * (trailing "." or zeros) and only adding thousands separators.
 */
export function formatEntry(entry: string): string {
  const [integer, fraction] = entry.split('.')
  const sign = integer.startsWith('-') ? '-' : ''
  const digits = integer.slice(sign.length).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? sign + digits : `${sign}${digits}.${fraction}`
}

const ERROR_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  NEGATIVE_SQUARE_ROOT: 'Invalid input',
  UNDEFINED_RESULT: 'Undefined result',
  RESULT_OUT_OF_RANGE: 'Result too large',
  NETWORK_ERROR: 'Service unavailable',
}

/** Turns any failure into a short message that fits the display. */
export function formatError(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? 'Something went wrong'
  return 'Something went wrong'
}
