import React from 'react'

type Variant = 'primary' | 'outline'
type Size = 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'btn-primary',
  outline: 'border border-[var(--color-border-input)] text-[var(--color-text)] hover:bg-slate-50',
}

const sizeClasses: Record<Size, string> = {
  md: 'py-2 text-sm',
  lg: 'py-3 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`w-full font-semibold rounded-[var(--radius-md)] transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}
