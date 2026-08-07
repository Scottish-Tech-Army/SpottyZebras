'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as a destructive (red) action. */
  danger?: boolean
  /** Disables the buttons and shows a pending label while an action runs. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** A small modal that asks the user to confirm before a consequential action. */
export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger, busy,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />

      <div className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6">
        <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
        {message && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">{message}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-input)] text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-sand)] transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:opacity-50 ${
              danger ? 'text-white' : 'btn-primary'
            }`}
            style={danger ? { backgroundColor: 'var(--color-error)' } : undefined}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
