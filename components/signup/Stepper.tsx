'use client'

const STEPS = ['About you', 'Children', 'Account']

export default function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1
        const active = n === current
        const done = n < current
        const filled = active || done
        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold"
                style={
                  filled
                    ? { backgroundColor: 'var(--color-secondary)', color: '#fff' }
                    : { border: '2px solid var(--color-border-input)', color: 'var(--color-text-muted)' }
                }
              >
                {done ? '✓' : n}
              </div>
              <span
                className="mt-2 text-xs whitespace-nowrap"
                style={{
                  color: active ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <div
                className="flex-1 h-0.5 mt-4 mx-2"
                style={{ backgroundColor: 'var(--color-border-input)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
