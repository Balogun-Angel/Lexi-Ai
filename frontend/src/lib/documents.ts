import type { DocumentStatus } from '../types/document'

export function canChatWithDocument(status: DocumentStatus): boolean {
  return status === 'processed' || status === 'ready'
}

export function canProcessDocument(status: DocumentStatus): boolean {
  return status === 'uploaded' || status === 'failed' || status === 'processed'
}

export function getChatDisabledReason(status: DocumentStatus, statusMessage?: string | null): string {
  if (canChatWithDocument(status)) return ''

  const reasons: Record<DocumentStatus, string> = {
    uploaded: 'Document must be processed before chatting.',
    processing: 'Document is still processing.',
    processed: '',
    ready: '',
    failed: 'Document processing failed. Reprocess before chatting.',
    needs_ocr: statusMessage ?? 'This document needs OCR before it can be used for chat.',
  }

  return reasons[status]
}
