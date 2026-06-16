import type { Citation } from '../../data/mockData'
import { cn } from '../../lib/utils'

interface CitationCardProps {
  citation: Citation
  variant?: 'pill' | 'panel'
  active?: boolean
  onClick?: () => void
}

export function CitationCard({
  citation,
  variant = 'panel',
  active = false,
  onClick,
}: CitationCardProps) {
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
          active
            ? 'border-primary bg-primary/20 text-primary'
            : 'border-border bg-surface-hover text-text-secondary hover:border-primary/50 hover:text-text-primary',
        )}
      >
        Page {citation.pageNumber}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-surface-card hover:border-primary/30',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-text-primary">
          {citation.documentTitle ?? 'Document'}
        </span>
        <span className="shrink-0 text-xs text-accent-cyan">Page {citation.pageNumber}</span>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{citation.snippet}</p>
    </button>
  )
}
