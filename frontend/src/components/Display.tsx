interface DisplayProps {
  expression: string
  value: string
  isError: boolean
}

export function Display({ expression, value, isError }: DisplayProps) {
  const size = value.length > 12 ? 'text-3xl' : 'text-5xl'
  const color = isError ? 'text-rose-400' : 'text-white'

  return (
    <div className="flex min-h-32 flex-col items-end justify-end gap-1 px-2 pb-4 text-right">
      <p aria-label="Expression" className="min-h-6 text-lg break-all text-slate-400">
        {expression}
      </p>
      <output aria-live="polite" aria-label="Result" className={`font-light break-all ${size} ${color}`}>
        {value}
      </output>
    </div>
  )
}
