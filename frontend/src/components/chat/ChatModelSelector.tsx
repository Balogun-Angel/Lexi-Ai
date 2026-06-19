import { Zap, Brain } from 'lucide-react'
import { MODEL_MODE_OPTIONS, type ModelMode } from '../../lib/modelMode'
import { cn } from '../../lib/utils'

interface ChatModelSelectorProps {
  value: ModelMode
  onChange: (mode: ModelMode) => void
  disabled?: boolean
}

const MODE_ICONS = {
  fast: Zap,
  smart: Brain,
} as const

export function ChatModelSelector({ value, onChange, disabled = false }: ChatModelSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-text-muted">Mode</span>
      {(Object.keys(MODEL_MODE_OPTIONS) as ModelMode[]).map((mode) => {
        const option = MODEL_MODE_OPTIONS[mode]
        const Icon = MODE_ICONS[mode]
        const selected = value === mode

        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            title={option.description}
            onClick={() => onChange(mode)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface-hover text-text-secondary hover:border-primary/40 hover:text-text-primary',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function ChatModelModeHint({ mode }: { mode: ModelMode }) {
  const option = MODEL_MODE_OPTIONS[mode]
  return (
    <p className="text-xs text-text-muted">
      <span className="font-medium text-text-secondary">{option.label} Mode</span>
      {' — '}
      {option.description}
    </p>
  )
}
