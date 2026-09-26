interface HistoryToggleProps {
  isOpen: boolean
  controls: string
  onToggle: () => void
}

export function HistoryToggle({ isOpen, controls, onToggle }: HistoryToggleProps) {
  return (
    <button
      type="button"
      aria-label={isOpen ? 'Hide history' : 'Show history'}
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      className={[
        'rounded-full p-2 transition duration-150 ease-out [-webkit-tap-highlight-color:transparent]',
        'motion-safe:active:scale-90',
        'focus-visible:ring-2 focus-visible:ring-sezzle-orange focus-visible:outline-none',
        isOpen ? 'bg-white/10 text-white' : 'text-purple-200/60 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-5 transition-transform duration-200 ease-out ${isOpen ? 'motion-safe:-rotate-45' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    </button>
  )
}
