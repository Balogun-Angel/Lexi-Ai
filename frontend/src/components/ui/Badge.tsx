import { cn } from '../../lib/utils'
import type { DocumentStatus } from '../../data/mockData'

interface BadgeProps {
  status: DocumentStatus | 'processing-profile'
  className?: string
}

const statusConfig: Record<DocumentStatus | 'processing-profile', { label: string; className: string }> = {
  processing: {
    label: 'Processing',
    className: 'bg-warning/20 text-purple-300 border-warning/30',
  },
  'processing-profile': {
    label: 'Processing',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  ready: {
    label: 'Ready to Chat',
    className: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
}

export function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  )
}
