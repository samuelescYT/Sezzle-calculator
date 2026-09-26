import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HistoryPanel } from './HistoryPanel'

const entries = [
  { expression: '12 + 3 =', result: 15 },
  { expression: '80 + 20% =', result: 96 },
  { expression: '1 ÷ 3 =', result: 1 / 3 },
]

function renderPanel(props: Partial<ComponentProps<typeof HistoryPanel>> = {}) {
  const handlers = { onSelect: vi.fn(), onClear: vi.fn() }
  render(<HistoryPanel id="history" entries={entries} {...handlers} {...props} />)
  return handlers
}

const entryButtons = () => screen.getAllByRole('button').filter((button) => button.getAttribute('aria-label') !== 'Clear history')

describe('HistoryPanel', () => {
  it('shows an empty state and disables clearing when there is no history', () => {
    renderPanel({ entries: [] })

    expect(screen.getByText('No calculations yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled()
  })

  it('lists entries newest first as buttons named by equation and result', () => {
    renderPanel()

    expect(entryButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      '1 ÷ 3 = 0.333333333333333',
      '80 + 20% = 96',
      '12 + 3 = 15',
    ])
  })

  it('shows the equation above the formatted result, right-aligned', () => {
    renderPanel()

    const button = screen.getByRole('button', { name: '80 + 20% = 96' })
    const [expression, result] = button.children
    expect(expression).toHaveTextContent('80 + 20% =')
    expect(result).toHaveTextContent('96')
    expect(button).toHaveClass('text-right')
  })

  it('passes the picked entry to onSelect', async () => {
    const { onSelect } = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: '80 + 20% = 96' }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ expression: '80 + 20% =', result: 96 })
  })

  it('disables picking entries but still allows clearing when disabled', () => {
    renderPanel({ disabled: true })

    for (const button of entryButtons()) expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeEnabled()
  })

  it('calls onClear from the clear button', async () => {
    const { onClear } = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Clear history' }))

    expect(onClear).toHaveBeenCalledOnce()
  })

  it('staggers the entries in, capped so long histories still appear quickly', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ expression: `${i} + 1 =`, result: i + 1 }))
    renderPanel({ entries: many })

    const delays = screen.getAllByRole('listitem').map((item) => item.style.animationDelay)
    expect(delays.slice(0, 4)).toEqual(['0ms', '20ms', '40ms', '60ms'])
    expect(new Set(delays.slice(8))).toEqual(new Set(['160ms']))
    for (const item of screen.getAllByRole('listitem')) expect(item).toHaveClass('motion-safe:animate-item-in')
  })

  it('is a labelled region that the toggle can control', () => {
    renderPanel()

    expect(screen.getByRole('region', { name: 'History' })).toHaveAttribute('id', 'history')
  })
})
