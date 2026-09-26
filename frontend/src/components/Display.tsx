import type { ReactNode } from 'react'

interface DisplayProps {
  expression: string
  value: string
  isError: boolean
  /**
   * Replays the entrance animation whenever it changes. Callers keep it stable
   * while the user types, so only new results, operands and errors animate.
   */
  valueKey?: string
  /** Control shown in the top-left corner (the history toggle). */
  leading?: ReactNode
  className?: string
}

export function Display({ expression, value, isError, valueKey = value, leading, className = '' }: DisplayProps) {
  const size = value.length > 12 ? 'text-3xl' : 'text-5xl'
  const color = isError ? 'text-sezzle-coral' : 'text-white'
  const entrance = isError ? 'motion-safe:animate-shake' : 'motion-safe:animate-result-in'

  return (
    <div className={`relative flex flex-col items-end justify-end gap-1 px-2 pb-4 text-right ${className}`}>
      {leading && <div className="absolute top-0 left-0">{leading}</div>}
      <p aria-label="Expression" className="min-h-6 pl-10 text-lg break-all text-purple-200/70">
        {/* Keyed so the text fades in again whenever it changes. */}
        <span key={expression} className="inline-block motion-safe:animate-fade-in">
          {expression}
        </span>
      </p>
      {/* The live region stays mounted; only its content is re-keyed, so announcements keep working. */}
      <output aria-live="polite" aria-label="Result" className={`font-light break-all ${size} ${color}`}>
        <span key={valueKey} data-testid="result-value" className={`inline-block ${entrance}`}>
          {value}
        </span>
      </output>
    </div>
  )
}
