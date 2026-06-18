export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export interface ApiDocument {
  id: string
  user_id: string
  filename: string
  original_filename: string
  file_path: string
  status: DocumentStatus
  created_at: string
}

export interface DocumentDisplay {
  id: string
  title: string
  uploadedAt: string
  status: DocumentStatus
}
