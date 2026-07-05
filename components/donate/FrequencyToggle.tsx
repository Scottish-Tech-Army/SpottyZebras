'use client'

type Frequency = 'monthly' | 'one-off'

export default function FrequencyToggle({ value, onChange }: { value: Frequency; onChange: (v: Frequency) => void }) {
  return (
    <div className="seg-group flex rounded-[var(--radius-sm)] overflow-hidden text-sm font-medium">
      {(['one-off', 'monthly'] as Frequency[]).map(f => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`flex-1 py-2.5 transition ${value === f ? 'seg-active' : 'seg-idle'}`}
        >
          {f === 'monthly' ? 'Monthly' : 'One-off'}
        </button>
      ))}
    </div>
  )
}
