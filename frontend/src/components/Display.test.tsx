import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Display } from './Display'

describe('Display', () => {
  it('shows the expression and the value', () => {
    render(<Display expression="60 −" value="30" isError={false} />)

    expect(screen.getByLabelText('Expression')).toHaveTextContent('60 −')
    expect(screen.getByLabelText('Result')).toHaveTextContent('30')
  })

  it('announces value changes to screen readers', () => {
    render(<Display expression="" value="0" isError={false} />)

    expect(screen.getByLabelText('Result')).toHaveAttribute('aria-live', 'polite')
  })

  it('highlights errors', () => {
    render(<Display expression="" value="Cannot divide by zero" isError />)

    expect(screen.getByLabelText('Result')).toHaveClass('text-sezzle-coral')
  })

  it('shrinks long values', () => {
    const { rerender } = render(<Display expression="" value="123" isError={false} />)
    expect(screen.getByLabelText('Result')).toHaveClass('text-5xl')

    rerender(<Display expression="" value="1,234,567,890,123" isError={false} />)
    expect(screen.getByLabelText('Result')).toHaveClass('text-3xl')
  })
})

describe('Display leading control', () => {
  it('renders the leading control when provided', () => {
    render(<Display expression="" value="0" isError={false} leading={<button type="button">History</button>} />)

    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
  })
})

describe('Display animations', () => {
  const resultValue = () => screen.getByTestId('result-value')

  it('pops a new value in, but only when motion is allowed', () => {
    render(<Display expression="" value="42" isError={false} />)

    expect(resultValue()).toHaveClass('motion-safe:animate-result-in')
  })

  it('shakes an error instead', () => {
    render(<Display expression="" value="Cannot divide by zero" isError />)

    expect(resultValue()).toHaveClass('motion-safe:animate-shake')
    expect(resultValue()).not.toHaveClass('motion-safe:animate-result-in')
  })

  it('replays the animation when the value key changes', () => {
    const { rerender } = render(<Display expression="" value="15" valueKey="15" isError={false} />)
    const first = resultValue()

    rerender(<Display expression="" value="30" valueKey="30" isError={false} />)

    expect(resultValue()).not.toBe(first)
  })

  it('does not replay it while the value key stays the same, e.g. while typing', () => {
    const { rerender } = render(<Display expression="" value="1" valueKey="typing" isError={false} />)
    const first = resultValue()

    rerender(<Display expression="" value="12" valueKey="typing" isError={false} />)

    expect(resultValue()).toBe(first)
    expect(resultValue()).toHaveTextContent('12')
  })

  it('keeps the live region mounted so screen readers still announce changes', () => {
    const { rerender } = render(<Display expression="" value="15" valueKey="15" isError={false} />)
    const liveRegion = screen.getByLabelText('Result')

    rerender(<Display expression="" value="30" valueKey="30" isError={false} />)

    expect(screen.getByLabelText('Result')).toBe(liveRegion)
  })

  it('fades the expression in again when it changes', () => {
    const { rerender } = render(<Display expression="12 +" value="3" isError={false} />)
    const first = screen.getByText('12 +')
    expect(first).toHaveClass('motion-safe:animate-fade-in')

    rerender(<Display expression="12 + 3 =" value="15" isError={false} />)

    expect(screen.getByText('12 + 3 =')).not.toBe(first)
  })
})
