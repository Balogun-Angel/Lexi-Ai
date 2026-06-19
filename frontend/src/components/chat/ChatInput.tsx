import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  placeholder?: string
  className?: string
  onSend: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
}

export function ChatInput({
  placeholder = 'Ask anything about this document...',
  className,
  onSend,
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')

  function submitMessage() {
    const trimmed = value.trim()
    if (!trimmed || disabled || isLoading) return
    onSend(trimmed)
    setValue('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submitMessage()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-end gap-3 rounded-2xl border border-border bg-surface-card p-3',
        className,
      )}
    >
      <textarea
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
      />

      <Button type="submit" size="sm" className="shrink-0" disabled={disabled || isLoading || !value.trim()}>
        {isLoading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="mr-1.5 h-3.5 w-3.5" />
        )}
        Send
      </Button>
    </form>
  )
}
