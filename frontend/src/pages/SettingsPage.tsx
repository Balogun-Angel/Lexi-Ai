import { type ElementType, type ReactNode } from 'react'
import {
  Bell,
  HardDrive,
  Key,
  Palette,
  Shield,
  User,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { mockStats, mockUser } from '../data/mockData'
import { cn } from '../lib/utils'

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        enabled ? 'bg-accent-cyan' : 'bg-surface-hover',
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </div>
  )
}

function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <Card glow className="relative">
      <Icon className="absolute right-4 top-4 h-4 w-4 text-text-muted" />
      <h3 className="mb-4 text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </Card>
  )
}

export function SettingsPage() {
  const storagePercent = (mockStats.storageUsedGb / mockStats.storageLimitGb) * 100

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Settings</h1>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <SettingsCard title="Profile" icon={User}>
            <div className="space-y-4">
              <Input label="Name" defaultValue={mockUser.name} readOnly />
              <Input label="Email" defaultValue={mockUser.email} readOnly />
              <Badge status="processing-profile" />
            </div>
          </SettingsCard>

          <SettingsCard title="Appearance" icon={Palette}>
            <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-surface-hover">
              <div className="flex gap-2">
                <div className="h-16 w-24 rounded-lg bg-surface border border-border" />
                <div className="h-16 w-8 rounded-lg bg-primary/30 border border-primary/50" />
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">Dark mode (default)</p>
          </SettingsCard>

          <SettingsCard title="API Keys" icon={Key}>
            <p className="mb-4 text-sm text-text-muted">
              Manage API keys for external integrations.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <span className="flex-1 font-mono text-sm text-text-muted">sk-••••••••••••••••</span>
              <button type="button" className="text-xs text-primary hover:underline">
                Copy
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications" icon={Bell}>
            <div className="space-y-4">
              {[
                { label: 'Task notifications', enabled: true },
                { label: 'Email notifications', enabled: false },
                { label: 'Social messages', enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{item.label}</span>
                  <Toggle enabled={item.enabled} />
                </div>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Account Security" icon={Shield}>
            <div className="space-y-4">
              {[
                { label: 'Two-factor auth', enabled: true },
                { label: 'Strong password', enabled: true },
                { label: 'Session alerts', enabled: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{item.label}</span>
                  <Toggle enabled={item.enabled} />
                </div>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Storage Management" icon={HardDrive}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-text-primary">
                {mockStats.storageUsedGb} GB
              </span>
              <span className="text-sm text-text-muted">/ {mockStats.storageLimitGb} GB</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Documents
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-cyan" />
                Embeddings
              </span>
            </div>
          </SettingsCard>
        </div>
      </div>
    </AppLayout>
  )
}
