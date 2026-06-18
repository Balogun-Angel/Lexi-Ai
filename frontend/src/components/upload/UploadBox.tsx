import { useRef, type DragEvent } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

interface UploadBoxProps {
  variant?: 'default' | 'hero' | 'compact'
  className?: string
  onBrowse?: () => void
  onFileSelect?: (file: File) => void
  isLoading?: boolean
  disabled?: boolean
}

export function UploadBox({
  variant = 'default',
  className,
  onBrowse,
  onFileSelect,
  isLoading = false,
  disabled = false,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isDisabled = disabled || isLoading

  function openFilePicker() {
    if (isDisabled) return
    onBrowse?.()
    inputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect?.(file)
    }
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (isDisabled) return

    const file = event.dataTransfer.files?.[0]
    if (file) {
      onFileSelect?.(file)
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,application/pdf"
      className="hidden"
      onChange={handleFileChange}
      disabled={isDisabled}
    />
  )

  if (variant === 'hero') {
    return (
      <div className={cn('text-center', className)}>
        {fileInput}
        <Button size="lg" onClick={openFilePicker} disabled={isDisabled}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Your First PDF'
          )}
        </Button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'flex flex-col items-center justify-center border-dashed border-border/80 py-12 text-center',
          className,
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {fileInput}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
            <FileUp className="h-7 w-7 text-primary" />
          )}
        </div>
        <p className="mb-1 text-text-primary">
          {isLoading ? 'Uploading PDF...' : 'Drag and drop PDFs or'}
        </p>
        <Button size="sm" className="mt-3" onClick={openFilePicker} disabled={isDisabled}>
          {isLoading ? 'Uploading...' : 'Browse Files'}
        </Button>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center border-dashed border-2 border-border/60 py-16 text-center transition-colors hover:border-primary/40',
        isDisabled && 'pointer-events-none opacity-70',
        className,
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {fileInput}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-hover">
        {isLoading ? (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        ) : (
          <svg viewBox="0 0 48 56" className="h-12 w-12 text-red-400" fill="currentColor">
            <path d="M8 0h24l16 16v40H8V0zm24 4v12h12L32 4zM14 32h20v4H14v-4zm0 8h14v4H14v-4z" />
          </svg>
        )}
      </div>
      <p className="mb-1 text-lg text-text-primary">
        {isLoading ? 'Uploading PDF...' : 'Drag and drop PDFs or'}
      </p>
      <p className="mb-6 text-sm text-text-muted">PDF files up to 20 MB</p>
      <Button onClick={openFilePicker} disabled={isDisabled}>
        {isLoading ? 'Uploading...' : 'Browse Files'}
      </Button>
    </Card>
  )
}
