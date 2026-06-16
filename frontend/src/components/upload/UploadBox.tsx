import { FileUp } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

interface UploadBoxProps {
  variant?: 'default' | 'hero' | 'compact'
  className?: string
  onBrowse?: () => void
}

export function UploadBox({ variant = 'default', className, onBrowse }: UploadBoxProps) {
  if (variant === 'hero') {
    return (
      <div className={cn('text-center', className)}>
        <Button size="lg" onClick={onBrowse}>
          Upload Your First PDF
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
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileUp className="h-7 w-7 text-primary" />
        </div>
        <p className="mb-1 text-text-primary">Drag and drop PDFs or</p>
        <Button size="sm" className="mt-3" onClick={onBrowse}>
          Browse Files
        </Button>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center border-dashed border-2 border-border/60 py-16 text-center transition-colors hover:border-primary/40',
        className,
      )}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-hover">
        <svg viewBox="0 0 48 56" className="h-12 w-12 text-red-400" fill="currentColor">
          <path d="M8 0h24l16 16v40H8V0zm24 4v12h12L32 4zM14 32h20v4H14v-4zm0 8h14v4H14v-4z" />
        </svg>
      </div>
      <p className="mb-1 text-lg text-text-primary">Drag and drop PDFs or</p>
      <p className="mb-6 text-sm text-text-muted">PDF files up to 20 MB</p>
      <Button onClick={onBrowse}>Browse Files</Button>
    </Card>
  )
}
