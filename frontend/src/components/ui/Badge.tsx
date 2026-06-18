import { cn } from '../../lib/utils'
import type { DocumentStatus } from '../../types/document'

interface BadgeProps {
  status: DocumentStatus | 'processing-profile'
  className?: string
}

const statusConfig: Record<DocumentStatus | 'processing-profile', { label: string; className: string }> = {
  uploaded: {
    label: 'Uploaded',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  processing: {
    label: 'Processing',
    className: 'bg-warning/20 text-purple-300 border-warning/30',
  },
  processed: {
    label: 'Processed',
    className: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
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
  needs_ocr: {
    label: 'Needs OCR',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
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
