import type { BinaryOperator, CalculatorAction, Digit } from '../calculator/reducer'

type Variant = 'digit' | 'function' | 'operator' | 'equals' | 'clear'

interface KeyDefinition {
  label: string
  name: string
  action: CalculatorAction
  variant: Variant
  className?: string
}

const digit = (value: Digit, className?: string): KeyDefinition => ({
  label: value,
  name: value,
  action: { type: 'digit', digit: value },
  variant: 'digit',
  className,
})

const operator = (label: string, name: string, value: BinaryOperator): KeyDefinition => ({
  label,
  name,
  action: { type: 'operator', operator: value },
  variant: 'operator',
})

/** Keys in visual order for a 4-column grid. */
const KEYS: KeyDefinition[] = [
  { label: 'AC', name: 'All clear', action: { type: 'clear' }, variant: 'clear' },
  { label: '⌫', name: 'Backspace', action: { type: 'backspace' }, variant: 'function' },
  { label: '%', name: 'Percent', action: { type: 'percent' }, variant: 'function' },
  operator('÷', 'Divide', 'divide'),
  { label: '√', name: 'Square root', action: { type: 'sqrt' }, variant: 'function' },
  operator('xʸ', 'Power', 'power'),
  { label: '±', name: 'Toggle sign', action: { type: 'toggleSign' }, variant: 'function' },
  operator('×', 'Multiply', 'multiply'),
  digit('7'),
  digit('8'),
  digit('9'),
  operator('−', 'Subtract', 'subtract'),
  digit('4'),
  digit('5'),
  digit('6'),
  operator('+', 'Add', 'add'),
  digit('1'),
  digit('2'),
  digit('3'),
  { label: '=', name: 'Equals', action: { type: 'equals' }, variant: 'equals', className: 'row-span-2' },
  digit('0', 'col-span-2'),
  { label: '.', name: 'Decimal point', action: { type: 'decimal' }, variant: 'digit' },
]

/** Sezzle palette: purple operators, green equals, coral for clearing, dark digits. */
const VARIANT_STYLES: Record<Variant, string> = {
  digit: 'bg-white/[0.06] text-white hover:bg-white/[0.12]',
  function: 'bg-white/[0.14] text-purple-100 hover:bg-white/20',
  clear: 'bg-white/[0.14] text-sezzle-coral hover:bg-white/20',
  operator: 'bg-sezzle-purple text-white hover:bg-sezzle-purple/85',
  // Dark text: white on this green would fall below WCAG contrast for text.
  equals: 'bg-sezzle-green text-sezzle-night hover:bg-sezzle-green/85',
}

const ACTIVE_OPERATOR_STYLE = 'bg-white text-sezzle-purple'

interface KeypadProps {
  onPress: (action: CalculatorAction) => void
  disabled: boolean
  activeOperator: BinaryOperator | null
}

export function Keypad({ onPress, disabled, activeOperator }: KeypadProps) {
  return (
    <div className="grid h-full grid-cols-4 grid-rows-6 gap-3">
      {KEYS.map(({ label, name, action, variant, className = '' }) => {
        const isOperator = action.type === 'operator'
        const isActive = isOperator && action.operator === activeOperator

        return (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={isOperator ? isActive : undefined}
            // AC stays enabled so an in-flight calculation can be cancelled.
            disabled={disabled && action.type !== 'clear'}
            onClick={() => onPress(action)}
            className={[
              'rounded-2xl text-2xl font-medium select-none',
              // Native-feeling press: quick to shrink (75ms), a little slower to spring back (150ms),
              // and no grey tap flash on mobile browsers.
              'touch-manipulation transition duration-150 ease-out [-webkit-tap-highlight-color:transparent]',
              'motion-safe:active:scale-[0.94] active:duration-75',
              'focus-visible:ring-4 focus-visible:ring-sezzle-orange focus-visible:outline-none',
              // Dim only if a request takes longer than 200ms, so fast calculations never flicker.
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:delay-200',
              isActive ? ACTIVE_OPERATOR_STYLE : VARIANT_STYLES[variant],
              className,
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
