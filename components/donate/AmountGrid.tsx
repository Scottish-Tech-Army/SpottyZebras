'use client'

const PRESETS = [5, 10, 20, 50, 100]

export default function AmountGrid({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {PRESETS.map(a => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={`py-2.5 rounded-[var(--radius-sm)] border text-sm font-semibold transition ${
            value === a ? 'chip-active' : 'chip'
          }`}
        >
          £{a}
        </button>
      ))}
    </div>
  )
}
