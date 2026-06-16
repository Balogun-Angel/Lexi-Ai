import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, MessageSquare, Plus, Settings, Sparkles, User, X } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { ChatBubble } from '../components/chat/ChatBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { CitationCard } from '../components/chat/CitationCard'
import {
  mockChatMessages,
  mockConversations,
  mockDocuments,
  mockCitations,
} from '../data/mockData'
import { cn } from '../lib/utils'

export function ChatPage() {
  const [activeCitationId, setActiveCitationId] = useState<string | null>('c1')
  const [showCitationPanel, setShowCitationPanel] = useState(true)
  const activeDoc = mockDocuments[0]

  return (
    <div className="flex h-screen bg-surface">
      {/* Chat sidebar */}
      <aside className="flex w-60 flex-col border-r border-border bg-surface-elevated">
        <div className="border-b border-border px-5 py-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="p-4">
          <Button fullWidth size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Conversation history
          </p>
          {mockConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}

          <p className="mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Uploaded documents
          </p>
          {mockDocuments.slice(0, 2).map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                doc.id === activeDoc.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover',
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{doc.title}</span>
            </button>
          ))}
        </div>

        <nav className="space-y-1 border-t border-border px-3 py-4">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border px-6 py-4">
          <h1 className="truncate text-lg font-semibold text-text-primary">{activeDoc.title}</h1>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {mockChatMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              activeCitationId={activeCitationId}
              onCitationClick={setActiveCitationId}
            />
          ))}
        </div>

        <div className="border-t border-border p-4">
          <ChatInput />
        </div>
      </div>

      {/* PDF viewer / citation panel */}
      {showCitationPanel ? (
        <aside className="flex w-80 flex-col border-l border-border bg-surface-elevated xl:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text-primary">PDF viewer</span>
            <button
              type="button"
              onClick={() => setShowCitationPanel(false)}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-14 shrink-0 space-y-2 overflow-y-auto border-r border-border p-2">
              {[1, 2, 3].map((page) => (
                <div
                  key={page}
                  className={cn(
                    'aspect-[3/4] cursor-pointer rounded border bg-white p-1 text-[8px] text-gray-600',
                    page === 3 ? 'border-primary ring-1 ring-primary' : 'border-border',
                  )}
                >
                  <div className="h-full w-full bg-gray-100 p-1">
                    <div className="mb-1 h-1 w-3/4 rounded bg-gray-300" />
                    <div className="mb-0.5 h-0.5 w-full rounded bg-gray-200" />
                    <div className="h-0.5 w-5/6 rounded bg-gray-200" />
                  </div>
                  <p className="mt-1 text-center text-[9px] text-text-muted">{page}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-lg bg-white p-4 text-left text-xs leading-relaxed text-gray-800 shadow-sm">
                <p className="mb-2 font-bold text-sm">Chapter 3: Neural Networks</p>
                <p className="mb-2">
                  This chapter introduces the fundamental concepts behind artificial neural networks
                  and their role in modern machine learning systems.
                </p>
                <p className="mb-2">
                  Neural networks form the backbone of modern deep learning systems, enabling
                  machines to learn patterns from data without explicit programming.
                </p>
                <p
                  className={cn(
                    'mb-2 rounded px-1',
                    activeCitationId === 'c1' || activeCitationId === 'c2'
                      ? 'bg-yellow-200'
                      : '',
                  )}
                >
                  Backpropagation allows networks to adjust weights by propagating error gradients
                  backward through layers, enabling efficient training of deep architectures.
                </p>
                <p>
                  Transformer architectures have revolutionized natural language processing since
                  their introduction, forming the basis of large language models.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <p className="mb-3 text-xs font-medium text-text-muted">Citation panel</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
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
          </div>

          <Sparkles className="m-4 h-4 w-4 self-end text-text-muted/40" />
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setShowCitationPanel(true)}
          className="w-10 border-l border-border bg-surface-elevated text-xs text-text-muted hover:bg-surface-hover"
        >
          ◀
        </button>
      )}
    </div>
  )
}
