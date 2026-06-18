import { Link } from 'react-router-dom'
import { FileText, HardDrive, HelpCircle, MessageSquare } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { UploadBox } from '../components/upload/UploadBox'
import { DocumentCard } from '../components/documents/DocumentCard'
import { StatCard } from '../components/ui/StatCard'
import { useAuth } from '../context/AuthContext'
import { useDocuments } from '../hooks/useDocuments'
import { mockStats } from '../data/mockData'

export function DashboardPage() {
  const { user } = useAuth()
  const { documents, isLoading, error } = useDocuments()
  const storagePercent = (mockStats.storageUsedGb / mockStats.storageLimitGb) * 100
  const displayName = user?.full_name.split(' ')[0] ?? 'there'

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">
          Welcome back, {displayName} 👋
        </h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Documents" value={documents.length} icon={FileText} />
          <StatCard label="Questions Asked" value={mockStats.questionsAsked} icon={HelpCircle} />
          <StatCard label="Conversations" value={mockStats.conversations} icon={MessageSquare} />
          <StatCard
            label="Storage Used"
            value={`${mockStats.storageUsedGb} GB`}
            icon={HardDrive}
            progress={storagePercent}
          />
        </div>

        <div className="mb-10">
          <Link to="/upload">
            <UploadBox variant="compact" />
          </Link>
        </div>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Documents</h2>

          {isLoading && <p className="text-sm text-text-muted">Loading documents...</p>}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && documents.length === 0 && (
            <p className="text-sm text-text-muted">No documents uploaded yet.</p>
          )}

          {!isLoading && documents.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
