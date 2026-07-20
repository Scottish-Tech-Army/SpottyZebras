'use client'

/** Token-styled native <select>. Native = accessible + good mobile UX for free. */
export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-[var(--radius-sm)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm text-[var(--color-text)] border-[var(--color-border-input)]"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
