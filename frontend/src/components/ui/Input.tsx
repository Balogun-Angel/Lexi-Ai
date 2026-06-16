import { type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-border bg-surface-elevated px-4 py-3',
          'text-text-primary placeholder:text-text-muted',
          'transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          className,
        )}
        {...props}
      />
    </div>
  )
}
