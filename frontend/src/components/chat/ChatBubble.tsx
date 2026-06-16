import { Sparkles } from 'lucide-react'
import { CitationCard } from './CitationCard'
import type { ChatMessage } from '../../data/mockData'
import { cn } from '../../lib/utils'

interface ChatBubbleProps {
  message: ChatMessage
  activeCitationId?: string | null
  onCitationClick?: (citationId: string) => void
}

export function ChatBubble({ message, activeCitationId, onCitationClick }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-white">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-3">
        <div className="rounded-2xl rounded-tl-md border border-border bg-surface-card px-4 py-3 text-sm leading-relaxed text-text-secondary">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={cn(line.startsWith('•') && 'ml-1')}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationCard
                  key={citation.id}
                  citation={citation}
                  variant="pill"
                  active={activeCitationId === citation.id}
                  onClick={() => onCitationClick?.(citation.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
