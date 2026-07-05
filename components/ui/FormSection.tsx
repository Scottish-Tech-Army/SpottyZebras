export function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">{label}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
