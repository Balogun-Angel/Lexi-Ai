export type ModelMode = 'fast' | 'smart'

export const MODEL_MODE_STORAGE_KEY = 'lexiai_model_mode'

export const MODEL_MODE_OPTIONS: Record<
  ModelMode,
  { label: string; description: string }
> = {
  fast: {
    label: 'Fast Mode',
    description: 'Faster responses, best for simple questions',
  },
  smart: {
    label: 'Smart Mode',
    description: 'Deeper reasoning, best for summaries and complex questions',
  },
}

export function loadModelMode(): ModelMode {
  try {
    const stored = localStorage.getItem(MODEL_MODE_STORAGE_KEY)
    return stored === 'smart' ? 'smart' : 'fast'
  } catch {
    return 'fast'
  }
}

export function saveModelMode(mode: ModelMode) {
  localStorage.setItem(MODEL_MODE_STORAGE_KEY, mode)
}

export const SMART_MODE_RATE_LIMIT_MESSAGE =
  'Smart Mode is temporarily limited. Try Fast Mode or wait a moment.'

export const SMART_MODE_FALLBACK_NOTICE =
  'Smart Mode was limited, so LexiAI answered using Fast Mode.'
