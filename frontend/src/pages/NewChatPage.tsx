import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, FileText } from 'lucide-react'
import { ChatLayout } from '../components/chat/ChatLayout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchDocuments, mapDocument } from '../api/documents'
import { useChat } from '../context/ChatContext'
import { canChatWithDocument, getChatDisabledReason } from '../lib/documents'
import type { DocumentDisplay } from '../types/document'
import { cn } from '../lib/utils'

export function NewChatPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedId = searchParams.get('documentId')
  const { createSession } = useChat()

  const [documents, setDocuments] = useState<DocumentDisplay[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
      .then((data) => {
        const mapped = data.map(mapDocument)
        setDocuments(mapped)

        if (preselectedId) {
          const doc = mapped.find((item) => item.id === preselectedId)
          if (doc && canChatWithDocument(doc.status)) {
            setSelectedIds(new Set([preselectedId]))
          }
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load documents')
      })
      .finally(() => setIsLoading(false))
  }, [preselectedId])

  const selectedDocuments = useMemo(
    () => documents.filter((doc) => selectedIds.has(doc.id)),
    [documents, selectedIds],
  )

  function toggleDocument(doc: DocumentDisplay) {
    if (!canChatWithDocument(doc.status)) return

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(doc.id)) {
        next.delete(doc.id)
      } else {
        next.add(doc.id)
      }
      return next
    })
  }

  function handleStartChat() {
    if (selectedDocuments.length === 0) return

    const session = createSession(
      selectedDocuments.map((doc) => doc.id),
      selectedDocuments.map((doc) => doc.title),
    )
    navigate(`/chat?session=${session.id}`)
  }

  return (
    <ChatLayout
      title="Start a New Chat"
      subtitle="Select one or more processed documents to chat with."
    >
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && <p className="text-sm text-text-muted">Loading documents...</p>}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!isLoading && documents.length === 0 && (
          <Card className="max-w-xl text-center">
            <p className="mb-4 text-text-secondary">No documents uploaded yet.</p>
            <Link to="/upload">
              <Button>Upload a PDF</Button>
            </Link>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => {
            const chatable = canChatWithDocument(doc.status)
            const selected = selectedIds.has(doc.id)
            const disabledReason = getChatDisabledReason(doc.status, doc.statusMessage)

            return (
              <button
                key={doc.id}
                type="button"
                disabled={!chatable}
                onClick={() => toggleDocument(doc)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  chatable
                    ? selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface-card hover:border-primary/40'
                    : 'cursor-not-allowed border-border/60 bg-surface-card/50 opacity-70',
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
                      <FileText className="h-5 w-5 text-text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{doc.title}</p>
                      <p className="text-xs text-text-muted">Uploaded {doc.uploadedAt}</p>
                    </div>
                  </div>
                  {selected && chatable && <Check className="h-5 w-5 shrink-0 text-primary" />}
                </div>

                <Badge status={doc.status} />
                {!chatable && disabledReason && (
                  <p className="mt-3 text-xs leading-relaxed text-text-muted">{disabledReason}</p>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={selectedDocuments.length === 0} onClick={handleStartChat}>
            Start Chat
            {selectedDocuments.length > 0 ? ` (${selectedDocuments.length})` : ''}
          </Button>
          <Link to="/chat">
            <Button variant="outline">Back to Chat</Button>
          </Link>
        </div>
      </div>
    </ChatLayout>
  )
}
