import { MessageSquare, Quote, Search, Zap } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

const iconMap = {
  message: MessageSquare,
  quote: Quote,
  search: Search,
  zap: Zap,
} as const

interface FeatureCardProps {
  title: string
  description: string
  icon: keyof typeof iconMap
  className?: string
}

export function FeatureCard({ title, description, icon, className }: FeatureCardProps) {
  const Icon = iconMap[icon]

  return (
    <Card
      className={cn(
        'transition-colors hover:border-primary/30 hover:bg-surface-hover/50',
        className,
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mb-2 font-semibold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </Card>
  )
}
