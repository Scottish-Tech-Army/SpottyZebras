export function FormSection({
  label,
  tone = 'muted',
  children,
}: {
  label: string
  tone?: 'muted' | 'secondary'
  children: React.ReactNode
}) {
  const color = tone === 'secondary' ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color} mb-3`}>{label}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
