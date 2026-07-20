'use client'

/**
 * Native <input type="date">: gives a calendar picker AND keyboard entry, handles
 * locale formatting, and is accessible on mobile — so we don't have to choose
 * between a picker and a typed field. `min`/`max` restrict the selectable range
 * in the UI; the real rule lives in the caller's validator (re-run server-side).
 */
export default function DateField({
  label,
  value,
  onChange,
  onBlur,
  error,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  min?: string
  max?: string
}) {
  const borderClass = error ? 'border-[var(--color-error)]' : 'border-[var(--color-border-input)]'

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full px-3 py-2 border rounded-[var(--radius-sm)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm text-[var(--color-text)] ${borderClass}`}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  )
}
