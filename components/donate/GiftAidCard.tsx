'use client'

export default function GiftAidCard({
  checked,
  onChange,
  bonus = 0,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  bonus?: number
}) {
  return (
    <div className="giftaid-card rounded-[var(--radius-md)] border p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="giftaid-check mt-0.5 h-4 w-4 rounded border-[var(--color-border-input)]"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Add Gift Aid <span className="text-[var(--color-gift-aid-accent)] font-medium">+25% free</span>
          </p>
          {checked && bonus > 0 && (
            <p className="text-xs font-medium text-[var(--color-gift-aid-accent)] mt-1">
              We can claim an extra £{bonus.toFixed(2)} from the government — you pay nothing more.
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
            I&apos;m a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax
            than the amount of Gift Aid claimed on all my donations in that tax year, it is my
            responsibility to pay any difference.
          </p>
        </div>
      </label>
    </div>
  )
}
