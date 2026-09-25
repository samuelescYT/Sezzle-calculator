export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage'

const BASE_URL = '/api/v1/calculate'

/** Error raised for any failed calculation, carrying the API error code. */
export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface SuccessBody {
  result: number
}

interface ErrorBody {
  error: { code: string; message: string }
}

/**
 * Calls the backend to apply an operation. Unary operations (sqrt) omit `b`.
 * Resolves with the result or rejects with an ApiError.
 */
export async function calculate(
  operation: Operation,
  a: number,
  b?: number,
  signal?: AbortSignal,
): Promise<number> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b === undefined ? { a } : { a, b }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the calculator service')
  }

  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    if (isErrorBody(body)) throw new ApiError(body.error.code, body.error.message)
    throw new ApiError('HTTP_ERROR', `Request failed with status ${response.status}`)
  }
  if (!isSuccessBody(body)) {
    throw new ApiError('INVALID_RESPONSE', 'Unexpected response from the calculator service')
  }
  return body.result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSuccessBody(value: unknown): value is SuccessBody {
  return isRecord(value) && typeof value.result === 'number'
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}
