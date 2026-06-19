import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { DocumentDisplay } from '../../types/document'
import { canChatWithDocument, canProcessDocument } from '../../lib/documents'
import { cn } from '../../lib/utils'

interface DocumentCardProps {
  document: DocumentDisplay
  className?: string
  onProcess?: (documentId: string) => void
  isProcessing?: boolean
}

export function DocumentCard({
  document,
  className,
  onProcess,
  isProcessing = false,
}: DocumentCardProps) {
  const showProcess = canProcessDocument(document.status)
  const showAskAi = canChatWithDocument(document.status)

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

      <div className="mb-4 space-y-2">
        <Badge status={document.status} />
        {document.statusMessage && (
          <p className="text-xs leading-relaxed text-amber-300/90">{document.statusMessage}</p>
        )}
      </div>

      <div className="mt-auto space-y-2">
        <Link to={`/documents/${document.id}`}>
          <Button fullWidth size="sm" variant="primary">
            Open
          </Button>
        </Link>

        {showAskAi && (
          <Link to={`/chat/new?documentId=${document.id}`}>
            <Button fullWidth size="sm" variant="outline">
              Ask AI
            </Button>
          </Link>
        )}

        {showProcess && onProcess && (
          <Button
            fullWidth
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => onProcess(document.id)}
          >
            {isProcessing ? 'Processing...' : document.status === 'processed' ? 'Reprocess' : 'Process'}
          </Button>
        )}

        {document.status === 'processing' && (
          <Link to="/processing">
            <Button fullWidth size="sm" variant="outline">
              View Progress
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}
