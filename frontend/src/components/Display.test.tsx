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
