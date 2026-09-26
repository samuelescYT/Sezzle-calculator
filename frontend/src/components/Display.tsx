import type { ReactNode } from 'react'

interface DisplayProps {
  expression: string
  value: string
  isError: boolean
  /** Control shown in the top-left corner (the history toggle). */
  leading?: ReactNode
  className?: string
}

export function Display({ expression, value, isError, leading, className = '' }: DisplayProps) {
  const size = value.length > 12 ? 'text-3xl' : 'text-5xl'
  const color = isError ? 'text-sezzle-coral' : 'text-white'

  return (
    <div className={`relative flex flex-col items-end justify-end gap-1 px-2 pb-4 text-right ${className}`}>
      {leading && <div className="absolute top-0 left-0">{leading}</div>}
      <p aria-label="Expression" className="min-h-6 pl-10 text-lg break-all text-purple-200/70">
        {expression}
      </p>
      <output aria-live="polite" aria-label="Result" className={`font-light break-all ${size} ${color}`}>
        {value}
      </output>
    </div>
  )
}
