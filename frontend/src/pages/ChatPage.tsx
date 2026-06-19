import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare, Sparkles } from 'lucide-react'
import { ChatLayout } from '../components/chat/ChatLayout'
import { ChatBubble } from '../components/chat/ChatBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { CitationCard } from '../components/chat/CitationCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { mapChatMessage, sendChatMessage } from '../api/chat'
import { promptSuggestions } from '../data/mockData'
import { useChat } from '../context/ChatContext'

export function ChatPage() {
  const [searchParams] = useSearchParams()
  const sessionParam = searchParams.get('session')
  const { sessions, activeSession, setActiveSession, addMessages } = useChat()
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionParam) {
      setActiveSession(sessionParam)
    }
  }, [sessionParam, setActiveSession])

  const session = activeSession ?? sessions.find((item) => item.id === sessionParam) ?? null
  const title =
    session && session.documentTitles.length > 0
      ? session.documentTitles.length === 1
        ? session.documentTitles[0]
        : `Searching across ${session.documentTitles.length} documents`
      : undefined

  const messages = session?.messages ?? []

  const latestCitations = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message.role === 'assistant' && message.citations?.length) {
        return message.citations
      }
    }
    return []
  }, [messages])

  useEffect(() => {
    if (latestCitations.length > 0) {
      setActiveCitationId(latestCitations[0].id)
    }
  }, [latestCitations])

  async function handleSend(message: string) {
    if (!session) return

    setIsLoading(true)
    setError(null)

    try {
      const payload = session.backendSessionId
        ? { message, session_id: session.backendSessionId }
        : { message, document_ids: session.documentIds }

      const response = await sendChatMessage(payload)
      addMessages(
        session.id,
        [mapChatMessage(response.user_message), mapChatMessage(response.assistant_message)],
        response.session_id,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <ChatLayout title="Chat" subtitle="Select documents and start a conversation.">
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-lg text-center" padding="lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-text-primary">No active chat</h2>
            <p className="mb-6 text-sm text-text-secondary">
              Start a new chat by selecting one or more processed documents.
            </p>
            <Link to="/chat/new">
              <Button>Start New Chat</Button>
            </Link>
          </Card>
        </div>
      </ChatLayout>
    )
  }

  return (
    <ChatLayout
      title={title}
      subtitle={
        session.documentTitles.length > 1 ? session.documentTitles.join(', ') : undefined
      }
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <Card className="max-w-xl">
                <p className="mb-4 text-sm text-text-secondary">
                  Ask a question about{' '}
                  {session.documentTitles.length === 1
                    ? session.documentTitles[0]
                    : `your ${session.documentTitles.length} selected documents`}
                  . LexiAI will search the documents and answer with citations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSend(suggestion)}
                      className="rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary disabled:opacity-60"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </Card>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  activeCitationId={activeCitationId}
                  onCitationClick={setActiveCitationId}
                />
              ))
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <ChatInput
              placeholder="Ask anything about the selected documents..."
              onSend={handleSend}
              isLoading={isLoading}
            />
          </div>
        </div>

        <aside className="hidden w-80 flex-col border-l border-border bg-surface-elevated xl:flex">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text-primary">Sources</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {latestCitations.length === 0 ? (
              <p className="text-sm text-text-muted">
                Sources from the latest answer will appear here.
              </p>
            ) : (
              latestCitations.map((citation) => (
                <CitationCard
                  key={citation.id}
                  citation={citation}
                  variant="panel"
                  active={activeCitationId === citation.id}
                  onClick={() => setActiveCitationId(citation.id)}
                />
              ))
            )}
          </div>
          <Sparkles className="m-4 h-4 w-4 self-end text-text-muted/40" />
        </aside>
      </div>
    </ChatLayout>
  )
}
