import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Keypad } from './Keypad'

const KEY_NAMES = [
  'All clear', 'Backspace', 'Percent', 'Divide',
  'Square root', 'Power', 'Toggle sign', 'Multiply',
  '7', '8', '9', 'Subtract',
  '4', '5', '6', 'Add',
  '1', '2', '3', 'Equals',
  '0', 'Decimal point',
]

describe('Keypad', () => {
  it('renders every key in order', () => {
    render(<Keypad onPress={vi.fn()} disabled={false} activeOperator={null} />)

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    expect(names).toEqual(KEY_NAMES)
  })

  it.each([
    ['7', { type: 'digit', digit: '7' }],
    ['Decimal point', { type: 'decimal' }],
    ['Divide', { type: 'operator', operator: 'divide' }],
    ['Power', { type: 'operator', operator: 'power' }],
    ['Percent', { type: 'percent' }],
    ['Square root', { type: 'sqrt' }],
    ['Toggle sign', { type: 'toggleSign' }],
    ['Backspace', { type: 'backspace' }],
    ['Equals', { type: 'equals' }],
    ['All clear', { type: 'clear' }],
  ])('sends the action for %s', async (name, action) => {
    const onPress = vi.fn()
    render(<Keypad onPress={onPress} disabled={false} activeOperator={null} />)

    await userEvent.click(screen.getByRole('button', { name }))

    expect(onPress).toHaveBeenCalledExactlyOnceWith(action)
  })

  it('disables every key except All clear', () => {
    render(<Keypad onPress={vi.fn()} disabled activeOperator={null} />)

    for (const name of KEY_NAMES) {
      const button = screen.getByRole('button', { name })
      if (name === 'All clear') expect(button).toBeEnabled()
      else expect(button).toBeDisabled()
    }
  })

  it('marks only the active operator as pressed', () => {
    render(<Keypad onPress={vi.fn()} disabled={false} activeOperator="multiply" />)

    expect(screen.getByRole('button', { name: 'Multiply' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '7' })).not.toHaveAttribute('aria-pressed')
  })
})
