import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  glow = false,
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface-card',
        paddingStyles[padding],
        glow && 'border-primary/30 glow-primary',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
