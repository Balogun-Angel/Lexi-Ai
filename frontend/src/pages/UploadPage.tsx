import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { UploadBox } from '../components/upload/UploadBox'
import { DocumentCard } from '../components/documents/DocumentCard'
import { uploadDocument } from '../api/documents'
import { useDocuments } from '../hooks/useDocuments'
import { cn } from '../lib/utils'

export function UploadPage() {
  const navigate = useNavigate()
  const { documents, isLoading: isLoadingDocuments, error: documentsError } = useDocuments()
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  async function handleFileSelect(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ type: 'error', text: 'Only PDF files are allowed.' })
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      await uploadDocument(file)
      setMessage({ type: 'success', text: `"${file.name}" uploaded successfully.` })
      navigate('/dashboard')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Upload Documents</h1>
        <p className="mb-8 text-text-secondary">
          Upload PDF files to extract, chunk, and prepare them for AI-powered chat.
        </p>

        {message && (
          <div
            className={cn(
              'mb-6 rounded-xl border px-4 py-3 text-sm',
              message.type === 'success'
                ? 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                : 'border-red-500/30 bg-red-500/10 text-red-400',
            )}
          >
            {message.text}
          </div>
        )}

        <UploadBox className="mb-10" onFileSelect={handleFileSelect} isLoading={isUploading} />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Your Documents</h2>

          {isLoadingDocuments && (
            <p className="text-sm text-text-muted">Loading documents...</p>
          )}

          {documentsError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {documentsError}
            </div>
          )}

          {!isLoadingDocuments && !documentsError && documents.length === 0 && (
            <p className="text-sm text-text-muted">No documents uploaded yet.</p>
          )}

          {!isLoadingDocuments && documents.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
