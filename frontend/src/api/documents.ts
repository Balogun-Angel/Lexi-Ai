import type { ApiDocument, DocumentDisplay } from '../types/document'
import { apiRequest } from './client'

export interface ProcessAllResult {
  processed: number
  failed: number
}

export function processDocument(documentId: string): Promise<ApiDocument> {
  return apiRequest<ApiDocument>(`/documents/${documentId}/process`, {
    method: 'POST',
  })
}

export function processAllDocuments(): Promise<ProcessAllResult> {
  return apiRequest<ProcessAllResult>('/documents/process-all', {
    method: 'POST',
  })
}

export function uploadDocument(file: File): Promise<ApiDocument> {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<ApiDocument>('/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

export function fetchDocuments(): Promise<ApiDocument[]> {
  return apiRequest<ApiDocument[]>('/documents')
}

export function fetchDocument(documentId: string): Promise<ApiDocument> {
  return apiRequest<ApiDocument>(`/documents/${documentId}`)
}

export function deleteDocument(documentId: string): Promise<void> {
  return apiRequest<void>(`/documents/${documentId}`, {
    method: 'DELETE',
  })
}

export function mapDocument(document: ApiDocument): DocumentDisplay {
  return {
    id: document.id,
    title: document.original_filename,
    uploadedAt: formatUploadedDate(document.created_at),
    status: document.status,
    statusMessage: document.status_message,
  }
}

function formatUploadedDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
