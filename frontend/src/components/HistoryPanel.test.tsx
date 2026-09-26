import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HistoryPanel } from './HistoryPanel'

const entries = [
  { expression: '12 + 3 =', result: 15 },
  { expression: '80 + 20% =', result: 96 },
  { expression: '1 ÷ 3 =', result: 1 / 3 },
]

describe('HistoryPanel', () => {
  it('shows an empty state and disables clearing when there is no history', () => {
    render(<HistoryPanel id="history" entries={[]} onClear={vi.fn()} />)

    expect(screen.getByText('No calculations yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled()
  })

  it('lists entries newest first with the equation above the formatted result', () => {
    render(<HistoryPanel id="history" entries={entries} onClear={vi.fn()} />)

    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      '1 ÷ 3 =0.333333333333333',
      '80 + 20% =96',
      '12 + 3 =15',
    ])

    const [expression, result] = within(items[1]).getAllByText(/./)
    expect(expression).toHaveTextContent('80 + 20% =')
    expect(result).toHaveTextContent('96')
  })

  it('right-aligns each entry', () => {
    render(<HistoryPanel id="history" entries={entries} onClear={vi.fn()} />)

    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toHaveClass('text-right')
    }
  })

  it('calls onClear from the clear button', async () => {
    const onClear = vi.fn()
    render(<HistoryPanel id="history" entries={entries} onClear={onClear} />)

    await userEvent.click(screen.getByRole('button', { name: 'Clear history' }))

    expect(onClear).toHaveBeenCalledOnce()
  })

  it('is a labelled region that the toggle can control', () => {
    render(<HistoryPanel id="history" entries={entries} onClear={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'History' })).toHaveAttribute('id', 'history')
  })
})
