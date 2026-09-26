import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate, type Operation } from '../api/calculatorApi'
import { HISTORY_STORAGE_KEY } from '../history/history'
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

  it('animates new results but not every typed digit', async () => {
    const user = setup()
    const resultValue = () => screen.getByTestId('result-value')

    await click(user, '1')
    const typing = resultValue()
    await click(user, '2')
    expect(resultValue()).toBe(typing)

    await click(user, 'Add', '3', 'Equals')
    await expectResult('15')
    expect(resultValue()).not.toBe(typing)
  })

  it('rotates the history icon while the panel is open', async () => {
    const user = setup()
    const icon = () => screen.getByRole('button', { name: /^(show|hide) history$/i }).querySelector('svg')

    expect(icon()).not.toHaveClass('motion-safe:-rotate-45')
    await click(user, 'Show history')
    expect(icon()).toHaveClass('motion-safe:-rotate-45')
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

  describe('history', () => {
    const openHistory = (user: UserEvent) => click(user, 'Show history')
    const historyPanel = () => screen.getByRole('region', { name: 'History' })
    const historyItems = () => within(historyPanel()).queryAllByRole('listitem').map((item) => item.textContent)
    const saved = () => JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? 'null')

    it('is hidden until the toggle is pressed', async () => {
      const user = setup()
      const toggle = screen.getByRole('button', { name: 'Show history' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()

      await openHistory(user)

      expect(screen.getByRole('button', { name: 'Hide history' })).toHaveAttribute('aria-expanded', 'true')
      expect(historyPanel()).toBeInTheDocument()

      await click(user, 'Hide history')
      expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
    })

    it('records results from equals and auto-resolved percentages, newest first', async () => {
      const user = setup()

      await click(user, '1', '2', 'Add', '3', 'Equals')
      await expectResult('15')
      await click(user, '8', '0', 'Add', '2', '0', 'Percent')
      await expectResult('96')
      await openHistory(user)

      expect(historyItems()).toEqual(['80 + 20% =96', '12 + 3 =15'])
      expect(saved()).toEqual([
        { expression: '12 + 3 =', result: 15 },
        { expression: '80 + 20% =', result: 96 },
      ])
    })

    it('does not record intermediate steps or failed calculations', async () => {
      const user = setup()

      await click(user, '9', 'Square root')
      await expectResult('3')
      await click(user, 'Add', '2', 'Multiply')
      await waitFor(() => expect(expression()).toHaveTextContent('5 ×'))
      await click(user, 'All clear', '8', 'Divide', '0', 'Equals')
      await expectResult('Cannot divide by zero')
      await openHistory(user)

      expect(screen.getByText('No calculations yet')).toBeInTheDocument()
      expect(saved()).toBeNull()
    })

    it('restores the saved history on the next visit', async () => {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ expression: '2 + 2 =', result: 4 }]))
      const user = setup()

      await openHistory(user)

      expect(historyItems()).toEqual(['2 + 2 =4'])
    })

    it('clears the history from the panel and from localStorage', async () => {
      const user = setup()
      await click(user, '1', 'Add', '1', 'Equals')
      await expectResult('2')
      await openHistory(user)
      expect(historyItems()).toEqual(['1 + 1 =2'])
      expect(saved()).not.toBeNull()

      await click(user, 'Clear history')

      expect(historyItems()).toEqual([])
      expect(screen.getByText('No calculations yet')).toBeInTheDocument()
      expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull()
    })

    it('ignores a result that arrives after All clear', async () => {
      let respond: (value: number) => void = () => {}
      calculateMock.mockImplementation(() => new Promise((resolve) => (respond = resolve)))
      const user = setup()

      await click(user, '2', 'Add', '3', 'Equals', 'All clear')
      await act(async () => respond(5))
      await openHistory(user)

      expect(result()).toHaveTextContent('0')
      expect(screen.getByText('No calculations yet')).toBeInTheDocument()
    })

    it('keeps the display visible and the calculator usable while open', async () => {
      const user = setup()
      await openHistory(user)

      await user.keyboard('6*7{Enter}')

      await expectResult('42')
      expect(historyItems()).toEqual(['6 × 7 =42'])
    })

    describe('restoring an entry', () => {
      const savedEntries = [
        { expression: '12 + 3 =', result: 15 },
        { expression: '80 + 20% =', result: 96 },
      ]

      beforeEach(() => {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(savedEntries))
      })

      afterEach(() => {
        vi.unstubAllGlobals()
      })

      it('restores the result and its equation', async () => {
        const user = setup()
        await user.keyboard('123')
        await openHistory(user)

        await click(user, '80 + 20% = 96')

        expect(result()).toHaveTextContent('96')
        expect(expression()).toHaveTextContent('80 + 20% =')
      })

      it('lets the calculation continue from the restored result', async () => {
        const user = setup()
        await openHistory(user)
        await click(user, '12 + 3 = 15')

        await user.keyboard('*2{Enter}')

        await expectResult('30')
        expect(calls()).toEqual([['multiply', 15, 2]])
      })

      it('closes the panel on smaller screens, where it covers the keypad', async () => {
        const user = setup()
        await openHistory(user)

        await click(user, '12 + 3 = 15')

        expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Show history' })).toHaveAttribute('aria-expanded', 'false')
      })

      it('keeps the panel open on wide screens, where it sits beside the keypad', async () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(min-width: 48rem)' }))
        const user = setup()
        await openHistory(user)

        await click(user, '12 + 3 = 15')

        expect(result()).toHaveTextContent('15')
        expect(historyPanel()).toBeInTheDocument()
      })

      it('cannot restore while a calculation is in flight', async () => {
        vi.stubGlobal('matchMedia', () => ({ matches: true }))
        calculateMock.mockImplementation(() => new Promise(() => {}))
        const user = setup()
        await openHistory(user)

        await click(user, '2', 'Add', '3', 'Equals')

        expect(screen.getByRole('button', { name: '12 + 3 = 15' })).toBeDisabled()
      })
    })
  })
})
