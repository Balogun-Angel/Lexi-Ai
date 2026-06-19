import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare, Sparkles } from 'lucide-react'
import { ChatLayout } from '../components/chat/ChatLayout'
import { ChatBubble } from '../components/chat/ChatBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { CitationCard } from '../components/chat/CitationCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { mockChatMessages, mockCitations } from '../data/mockData'
import { useChat } from '../context/ChatContext'

export function ChatPage() {
  const [searchParams] = useSearchParams()
  const sessionParam = searchParams.get('session')
  const { sessions, activeSession, setActiveSession } = useChat()
  const [activeCitationId, setActiveCitationId] = useState<string | null>('c1')

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

  const messages = session?.messages.length ? session.messages : session ? [] : mockChatMessages

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
                <p className="text-sm text-text-secondary">
                  Chat backend is not connected yet. This session is ready for{' '}
                  {session.documentTitles.length === 1
                    ? session.documentTitles[0]
                    : `${session.documentTitles.length} documents`}
                  .
                </p>
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

            {messages.length === 0 && (
              <div className="space-y-4 opacity-60">
                <p className="text-xs uppercase tracking-wider text-text-muted">Preview (mock)</p>
                {mockChatMessages.map((message) => (
                  <ChatBubble key={`mock-${message.id}`} message={message} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <ChatInput placeholder="Ask anything about the selected documents..." />
          </div>
        </div>

        <aside className="hidden w-80 flex-col border-l border-border bg-surface-elevated xl:flex">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text-primary">Sources</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {mockCitations.map((citation) => (
              <CitationCard
                key={citation.id}
                citation={citation}
                variant="panel"
                active={activeCitationId === citation.id}
                onClick={() => setActiveCitationId(citation.id)}
              />
            ))}
          </div>
          <Sparkles className="m-4 h-4 w-4 self-end text-text-muted/40" />
        </aside>
      </div>
    </ChatLayout>
  )
}
