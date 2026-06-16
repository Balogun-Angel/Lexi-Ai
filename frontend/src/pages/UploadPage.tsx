import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { UploadBox } from '../components/upload/UploadBox'
import { mockDocuments } from '../data/mockData'
import { DocumentCard } from '../components/documents/DocumentCard'

export function UploadPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Upload Documents</h1>
        <p className="mb-8 text-text-secondary">
          Upload PDF files to extract, chunk, and prepare them for AI-powered chat.
        </p>

        <UploadBox
          className="mb-10"
          onBrowse={() => navigate('/processing')}
        />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Your Documents</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
