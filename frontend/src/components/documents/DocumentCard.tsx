import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { DocumentDisplay } from '../../types/document'
import { cn } from '../../lib/utils'

interface DocumentCardProps {
  document: DocumentDisplay
  className?: string
}

export function DocumentCard({ document, className }: DocumentCardProps) {
  const href =
    document.status === 'processing'
      ? '/processing'
      : document.status === 'ready'
        ? '/chat'
        : null

  const buttonLabel =
    document.status === 'processing'
      ? 'View Progress'
      : document.status === 'ready'
        ? 'Open'
        : 'Uploaded'

  const button = (
    <Button
      fullWidth
      size="sm"
      variant={document.status === 'ready' ? 'primary' : 'outline'}
      disabled={document.status === 'uploaded'}
    >
      {buttonLabel}
    </Button>
  )

  return (
    <Card padding="sm" className={cn('flex flex-col', className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
          <FileText className="h-5 w-5 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">{document.title}</h3>
          <p className="mt-0.5 text-xs text-text-muted">Uploaded {document.uploadedAt}</p>
        </div>
      </div>

      <div className="mb-4">
        <Badge status={document.status} />
      </div>

      {href ? (
        <Link to={href} className="mt-auto">
          {button}
        </Link>
      ) : (
        <div className="mt-auto">{button}</div>
      )}
    </Card>
  )
}
