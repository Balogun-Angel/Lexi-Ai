import { Image, Paperclip, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  placeholder?: string
  className?: string
}

export function ChatInput({
  placeholder = 'Ask anything about this document...',
  className,
}: ChatInputProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-3 rounded-2xl border border-border bg-surface-card p-3',
        className,
      )}
    >
      <div className="flex gap-2 pb-1">
        <button
          type="button"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          aria-label="Upload image"
        >
          <Image className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>

      <textarea
        rows={1}
        placeholder={placeholder}
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />

      <Button size="sm" className="shrink-0">
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Send
      </Button>
    </div>
  )
}
