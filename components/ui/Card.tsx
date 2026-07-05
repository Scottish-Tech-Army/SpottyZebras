interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] backdrop-blur-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  )
}
