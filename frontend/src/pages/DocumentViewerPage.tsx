import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageSquare, RefreshCw, Trash2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  deleteDocument,
  fetchDocument,
  fetchDocumentFileBlob,
  mapDocument,
  processDocument,
} from '../api/documents'
import { canChatWithDocument, canProcessDocument } from '../lib/documents'
import { cn } from '../lib/utils'

export function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(
    null,
  )
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [document, setDocument] = useState<ReturnType<typeof mapDocument> | null>(null)

  useEffect(() => {
    if (!documentId) return

    let objectUrl: string | null = null
    setIsLoading(true)
    setError(null)

    Promise.all([fetchDocument(documentId), fetchDocumentFileBlob(documentId)])
      .then(([apiDoc, blobUrl]) => {
        objectUrl = blobUrl
        setDocument(mapDocument(apiDoc))
        setPdfUrl(blobUrl)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      })
      .finally(() => setIsLoading(false))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  async function handleProcess() {
    if (!documentId) return
    setIsProcessing(true)
    setMessage(null)

    try {
      const updated = await processDocument(documentId)
      setDocument(mapDocument(updated))
      if (updated.status === 'needs_ocr') {
        setMessage({
          type: 'warning',
          text:
            updated.status_message ??
            'This PDF appears to be scanned or image-based. OCR support will be added later.',
        })
      } else if (updated.status === 'failed') {
        setMessage({ type: 'error', text: 'Document processing failed.' })
      } else {
        setMessage({ type: 'success', text: 'Document processed successfully.' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process document.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleDelete() {
    if (!documentId || !window.confirm('Delete this document permanently?')) return
    setIsDeleting(true)
    setMessage(null)

    try {
      await deleteDocument(documentId)
      navigate('/dashboard')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete document.',
      })
      setIsDeleting(false)
    }
  }

  const showProcess = document ? canProcessDocument(document.status) : false
  const showChat = document ? canChatWithDocument(document.status) : false
  const processLabel =
    document?.status === 'processed' || document?.status === 'ready' ? 'Reprocess' : 'Process'

  return (
    <AppLayout>
      <div className="p-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {isLoading && <p className="text-sm text-text-muted">Loading document...</p>}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div
            className={cn(
              'mb-6 rounded-xl border px-4 py-3 text-sm',
              message.type === 'success' &&
                'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
              message.type === 'warning' &&
                'border-amber-500/30 bg-amber-500/10 text-amber-300',
              message.type === 'error' && 'border-red-500/30 bg-red-500/10 text-red-400',
            )}
          >
            {message.text}
          </div>
        )}

        {document && (
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="space-y-6">
              <Card>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover">
                    <FileText className="h-6 w-6 text-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-semibold text-text-primary">{document.title}</h1>
                    <p className="mt-1 text-sm text-text-muted">Uploaded {document.uploadedAt}</p>
                  </div>
                </div>

                <div className="mb-6 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Processing status
                  </p>
                  <Badge status={document.status} />
                  {document.statusMessage && (
                    <p className="text-sm leading-relaxed text-amber-300/90">{document.statusMessage}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {showProcess && (
                    <Button
                      fullWidth
                      variant="outline"
                      disabled={isProcessing || isDeleting}
                      onClick={() => void handleProcess()}
                    >
                      <RefreshCw className={cn('mr-2 h-4 w-4', isProcessing && 'animate-spin')} />
                      {isProcessing ? 'Processing...' : processLabel}
                    </Button>
                  )}

                  {showChat && (
                    <Link to={`/chat/new?documentId=${document.id}`}>
                      <Button fullWidth>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Ask AI
                      </Button>
                    </Link>
                  )}

                  <Button
                    fullWidth
                    variant="outline"
                    disabled={isDeleting || isProcessing}
                    onClick={() => void handleDelete()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Document'}
                  </Button>
                </div>
              </Card>
            </div>

            <Card padding="sm" className="min-h-[70vh] overflow-hidden">
              <p className="mb-3 px-2 text-sm font-medium text-text-primary">Document preview</p>
              {pdfUrl ? (
                <iframe
                  title={document.title}
                  src={pdfUrl}
                  className="h-[calc(70vh-2rem)] w-full rounded-lg border border-border bg-white"
                />
              ) : (
                <div className="flex h-[calc(70vh-2rem)] items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
                  PDF preview unavailable
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
