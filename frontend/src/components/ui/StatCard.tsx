import { type LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  progress?: number
  className?: string
}

export function StatCard({ label, value, icon: Icon, progress, className }: StatCardProps) {
  return (
    <Card padding="sm" className={cn('relative', className)}>
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
