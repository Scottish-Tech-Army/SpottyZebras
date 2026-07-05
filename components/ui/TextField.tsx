interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  type?: string
  placeholder?: string
  prefix?: string
  hint?: string
  error?: string
  required?: boolean
  autoComplete?: string
}

export function TextField({
  label, value, onChange, onBlur,
  type = 'text', placeholder, prefix, hint, error, required, autoComplete,
}: TextFieldProps) {
  const inputClass = 'bg-transparent focus:outline-none text-sm text-[var(--color-text)]'
  const borderClass = error ? 'border-[var(--color-error)]' : 'border-[var(--color-border-input)]'

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
      {prefix ? (
        <div className={`flex items-center border rounded-[var(--radius-sm)] bg-white focus-within:ring-2 focus-within:ring-[var(--color-focus)] ${borderClass}`}>
          <span className="pl-3 pr-1 text-[var(--color-text-muted)] text-sm select-none">{prefix}</span>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            className={`flex-1 pr-3 py-2 ${inputClass}`}
          />
        </div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full px-3 py-2 border rounded-[var(--radius-sm)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm text-[var(--color-text)] ${borderClass}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  )
}
