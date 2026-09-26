import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate, type Operation } from '../api/calculatorApi'
import { Calculator } from './Calculator'

vi.mock('../api/calculatorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/calculatorApi')>()),
  calculate: vi.fn(),
}))

const calculateMock = vi.mocked(calculate)

/** Mimics the backend so tests exercise realistic flows. */
async function fakeBackend(operation: Operation, a: number, b = 0): Promise<number> {
  switch (operation) {
    case 'add':
      return a + b
    case 'subtract':
      return a - b
    case 'multiply':
      return a * b
    case 'divide':
      if (b === 0) throw new ApiError('DIVISION_BY_ZERO', 'division by zero is undefined')
      return a / b
    case 'power':
      return a ** b
    case 'sqrt':
      return Math.sqrt(a)
    case 'percentage':
      return (a * b) / 100
  }
}

function setup() {
  const user = userEvent.setup()
  render(<Calculator />)
  return user
}

async function click(user: UserEvent, ...names: string[]) {
  for (const name of names) {
    await user.click(screen.getByRole('button', { name }))
  }
}

const result = () => screen.getByLabelText('Result')
const expression = () => screen.getByLabelText('Expression')

async function expectResult(text: string) {
  await waitFor(() => expect(result()).toHaveTextContent(text))
}

function calls() {
  return calculateMock.mock.calls.map(([operation, a, b]) => [operation, a, b])
}

beforeEach(() => {
  calculateMock.mockReset()
  calculateMock.mockImplementation(fakeBackend)
})

describe('Calculator', () => {
  it('starts at 0', () => {
    setup()
    expect(result()).toHaveTextContent('0')
    expect(expression()).toHaveTextContent('')
  })

  it('adds two numbers through the API', async () => {
    const user = setup()

    await click(user, '1', '2', 'Add', '3', 'Equals')

    await expectResult('15')
    expect(expression()).toHaveTextContent('12 + 3 =')
    expect(calls()).toEqual([['add', 12, 3]])
  })

  it('shows the first operand and operator while typing the second', async () => {
    const user = setup()

    await click(user, '6', '0', 'Subtract', '3')

    expect(expression()).toHaveTextContent('60 −')
    expect(result()).toHaveTextContent('3')
  })

  it('highlights the pending operator', async () => {
    const user = setup()

    await click(user, '5', 'Add')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')

    await click(user, '3')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('resolves a pending addition as soon as % is pressed', async () => {
    const user = setup()

    await click(user, '8', '0', 'Add', '2', '0', 'Percent')

    await expectResult('96')
    expect(expression()).toHaveTextContent('80 + 20% =')
    expect(calls()).toEqual([
      ['percentage', 20, 80],
      ['add', 80, 16],
    ])
  })

  it('treats a percentage as a fraction after multiply', async () => {
    const user = setup()

    await click(user, '6', '0', 'Multiply', '3', '0', 'Percent')

    await expectResult('18')
    expect(expression()).toHaveTextContent('60 × 30% =')
    expect(calls()).toEqual([
      ['percentage', 30, 1],
      ['multiply', 60, 0.3],
    ])
  })

  it('traces a standalone percentage', async () => {
    const user = setup()

    await click(user, '2', '0', 'Percent')

    await expectResult('0.2')
    expect(expression()).toHaveTextContent('20% =')
  })

  it('clears the trace on the next digit', async () => {
    const user = setup()

    await click(user, '2', '0', 'Percent')
    await expectResult('0.2')
    await click(user, '7')

    expect(result()).toHaveTextContent('7')
    expect(expression()).toHaveTextContent('')
  })

  it('evaluates chained operations left to right', async () => {
    const user = setup()

    await click(user, '1', '0', 'Add', '1', '0', 'Power')
    await waitFor(() => expect(expression()).toHaveTextContent('20 ^'))
    await click(user, '2', 'Equals')

    await expectResult('400')
    expect(calls()).toEqual([
      ['add', 10, 10],
      ['power', 20, 2],
    ])
  })

  it('computes a square root immediately and traces it', async () => {
    const user = setup()

    await click(user, '9', 'Square root')

    await expectResult('3')
    expect(expression()).toHaveTextContent('√9')
    expect(calls()).toEqual([['sqrt', 9, undefined]])
  })

  it('keeps the square root visible as the second operand', async () => {
    const user = setup()

    await click(user, '9', 'Add', '1', '6', 'Square root')
    await expectResult('4')
    expect(expression()).toHaveTextContent('9 + √16')

    await click(user, 'Equals')
    await expectResult('13')
    expect(expression()).toHaveTextContent('9 + √16 =')
  })

  it('hides floating point noise', async () => {
    const user = setup()

    await click(user, 'Decimal point', '1', 'Add', 'Decimal point', '2', 'Equals')

    await expectResult('0.3')
  })

  it('shows API errors and recovers on the next key', async () => {
    const user = setup()

    await click(user, '8', 'Divide', '0', 'Equals')
    await expectResult('Cannot divide by zero')

    await click(user, '7')
    expect(result()).toHaveTextContent('7')
  })

  it('shows a message when the service is unreachable', async () => {
    calculateMock.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Unable to reach the calculator service'))
    const user = setup()

    await click(user, '1', 'Add', '1', 'Equals')

    await expectResult('Service unavailable')
  })

  it('disables the keypad while a calculation is in flight', async () => {
    let respond: (value: number) => void = () => {}
    calculateMock.mockImplementation(() => new Promise((resolve) => (respond = resolve)))
    const user = setup()

    await click(user, '2', 'Add', '3', 'Equals')

    expect(screen.getByRole('region', { name: 'Calculator' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'All clear' })).toBeEnabled()

    await act(async () => respond(5))

    expect(result()).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled()
  })

  it('cancels an in-flight calculation on All clear without showing an error', async () => {
    let signal: AbortSignal | undefined
    calculateMock.mockImplementation((_operation, _a, _b, s) => {
      signal = s
      return new Promise((_, reject) => {
        s?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const user = setup()

    await click(user, '2', 'Add', '3', 'Equals', 'All clear')

    expect(signal?.aborted).toBe(true)
    await expectResult('0')
    expect(expression()).toHaveTextContent('')
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled()
  })

  describe('keyboard', () => {
    it('supports digits, operators and Enter', async () => {
      const user = setup()

      await user.keyboard('12+3{Enter}')

      await expectResult('15')
    })

    it('supports backspace and escape', async () => {
      const user = setup()

      await user.keyboard('123{Backspace}')
      expect(result()).toHaveTextContent('12')

      await user.keyboard('{Escape}')
      expect(result()).toHaveTextContent('0')
    })

    it.each(['Control', 'Meta', 'Alt'])('ignores shortcuts with the %s key', async (modifier) => {
      const user = setup()

      await user.keyboard(`{${modifier}>}1{/${modifier}}`)

      expect(result()).toHaveTextContent('0')
    })

    it('does not press a focused key again when Enter is pressed', async () => {
      const user = setup()

      await click(user, '5')
      await user.keyboard('{Enter}')

      expect(result()).toHaveTextContent('5')
    })
  })
})
