import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError, calculate } from './calculatorApi'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('calculate', () => {
  let fetchMock: Mock<typeof fetch>

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts both operands and returns the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ operation: 'divide', result: 2.5 }))

    await expect(calculate('divide', 10, 4)).resolves.toBe(2.5)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/calculate/divide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 10, b: 4 }),
      signal: undefined,
    })
  })

  it('omits b for unary operations', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ operation: 'sqrt', result: 3 }))

    await calculate('sqrt', 9)

    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ a: 9 }))
  })

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 1 }))
    const controller = new AbortController()

    await calculate('add', 0, 1, controller.signal)

    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('throws the API error code and message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }, 422),
    )

    const error = await calculate('divide', 1, 0).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' })
  })

  it('throws HTTP_ERROR when an error response has no envelope', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Request failed with status 502',
    })
  })

  it('throws INVALID_RESPONSE when a success response has no numeric result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 'three' }))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('throws INVALID_RESPONSE when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('throws NETWORK_ERROR when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the calculator service',
    })
  })

  it('rethrows the abort error when the request is cancelled', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('Aborted', 'AbortError')
    fetchMock.mockImplementation(() => {
      controller.abort()
      return Promise.reject(abortError)
    })

    await expect(calculate('add', 1, 2, controller.signal)).rejects.toBe(abortError)
  })
})
