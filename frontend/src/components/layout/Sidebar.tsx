import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { cn } from '../../lib/utils'

const mainNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'Chats', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const bottomNavItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/dashboard', label: 'Profile', icon: User },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-60 flex-col border-r border-border bg-surface-elevated',
        className,
      )}
    >
      <div className="border-b border-border px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {mainNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to + label}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <nav className="space-y-1 border-t border-border px-3 py-4">
        {bottomNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={`bottom-${label}`}
            to={to}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
