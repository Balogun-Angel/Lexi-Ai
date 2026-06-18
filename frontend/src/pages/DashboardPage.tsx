import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, HardDrive, HelpCircle, MessageSquare } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { UploadBox } from '../components/upload/UploadBox'
import { DocumentCard } from '../components/documents/DocumentCard'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useDocuments } from '../hooks/useDocuments'
import { processAllDocuments, processDocument } from '../api/documents'
import { mockStats } from '../data/mockData'
import { cn } from '../lib/utils'

export function DashboardPage() {
  const { user } = useAuth()
  const { documents, isLoading, error, reload } = useDocuments()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [processMessage, setProcessMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  const storagePercent = (mockStats.storageUsedGb / mockStats.storageLimitGb) * 100
  const displayName = user?.full_name.split(' ')[0] ?? 'there'

  const unprocessedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'uploaded' || doc.status === 'failed'),
    [documents],
  )

  async function handleProcess(documentId: string) {
    setProcessingId(documentId)
    setProcessMessage(null)

    try {
      const updated = await processDocument(documentId)
      await reload()
      if (updated.status === 'needs_ocr') {
        setProcessMessage({
          type: 'warning',
          text:
            updated.status_message ??
            'This PDF appears to be scanned or image-based. OCR support will be added later.',
        })
      } else if (updated.status === 'failed') {
        setProcessMessage({ type: 'error', text: 'Document processing failed.' })
      } else {
        setProcessMessage({ type: 'success', text: 'Document processed successfully.' })
      }
    } catch (err) {
      setProcessMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process document.',
      })
      await reload()
    } finally {
      setProcessingId(null)
    }
  }

  async function handleProcessAll() {
    setIsProcessingAll(true)
    setProcessMessage(null)

    try {
      const result = await processAllDocuments()
      await reload()
      setProcessMessage({
        type: 'success',
        text: `Processed ${result.processed} document(s). ${result.failed} failed.`,
      })
    } catch (err) {
      setProcessMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process documents.',
      })
    } finally {
      setIsProcessingAll(false)
    }
  }

  const isBusy = isProcessingAll || processingId !== null

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">
          Welcome back, {displayName} 👋
        </h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Documents" value={documents.length} icon={FileText} />
          <StatCard label="Questions Asked" value={mockStats.questionsAsked} icon={HelpCircle} />
          <StatCard label="Conversations" value={mockStats.conversations} icon={MessageSquare} />
          <StatCard
            label="Storage Used"
            value={`${mockStats.storageUsedGb} GB`}
            icon={HardDrive}
            progress={storagePercent}
          />
        </div>

        <div className="mb-10">
          <Link to="/upload">
            <UploadBox variant="compact" />
          </Link>
        </div>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Recent Documents</h2>
            {unprocessedDocuments.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleProcessAll()}
              >
                {isProcessingAll ? 'Processing All...' : 'Process All'}
              </Button>
            )}
          </div>

          {processMessage && (
            <div
              className={cn(
                'mb-4 rounded-xl border px-4 py-3 text-sm',
                processMessage.type === 'success' &&
                  'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
                processMessage.type === 'warning' &&
                  'border-amber-500/30 bg-amber-500/10 text-amber-300',
                processMessage.type === 'error' &&
                  'border-red-500/30 bg-red-500/10 text-red-400',
              )}
            >
              {processMessage.text}
            </div>
          )}

          {isLoading && <p className="text-sm text-text-muted">Loading documents...</p>}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && documents.length === 0 && (
            <p className="text-sm text-text-muted">No documents uploaded yet.</p>
          )}

          {!isLoading && documents.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onProcess={handleProcess}
                  isProcessing={processingId === doc.id || isProcessingAll}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
