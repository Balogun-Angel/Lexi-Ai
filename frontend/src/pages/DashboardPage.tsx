import { Link } from 'react-router-dom'
import { FileText, HardDrive, HelpCircle, MessageSquare } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { UploadBox } from '../components/upload/UploadBox'
import { DocumentCard } from '../components/documents/DocumentCard'
import { StatCard } from '../components/ui/StatCard'
import { mockDocuments, mockStats, mockUser } from '../data/mockData'

export function DashboardPage() {
  const storagePercent = (mockStats.storageUsedGb / mockStats.storageLimitGb) * 100

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">
          Welcome back, {mockUser.name} 👋
        </h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Documents" value={mockStats.totalDocuments} icon={FileText} />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mockDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
