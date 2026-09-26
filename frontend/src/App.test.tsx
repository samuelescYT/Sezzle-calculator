import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Sezzle Calculator heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Sezzle Calculator' })).toBeInTheDocument()
  })

  it('keeps the background glow decorative: hidden from assistive tech and not clickable', () => {
    render(<App />)

    const glow = screen.getByTestId('brand-glow')
    expect(glow).toHaveAttribute('aria-hidden', 'true')
    expect(glow).toHaveClass('pointer-events-none')
  })
})
