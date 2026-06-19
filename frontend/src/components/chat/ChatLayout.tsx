import { Link, useNavigate } from 'react-router-dom'
import { FileText, LogOut, MessageSquare, Plus, Settings, User } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { cn } from '../../lib/utils'

interface ChatLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function ChatLayout({ children, title, subtitle }: ChatLayoutProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { sessions, activeSessionId, setActiveSession } = useChat()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-surface">
      <aside className="flex w-60 flex-col border-r border-border bg-surface-elevated">
        <div className="border-b border-border px-5 py-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="p-4">
          <Link to="/chat/new">
            <Button fullWidth size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Conversation history
          </p>
          {sessions.length === 0 && (
            <p className="px-3 text-xs text-text-muted">No chats yet.</p>
          )}
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/chat?session=${session.id}`}
              onClick={() => setActiveSession(session.id)}
              className={cn(
                'mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                activeSessionId === session.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {session.documentTitles[0] ?? 'New chat'}
                {session.documentTitles.length > 1
                  ? ` +${session.documentTitles.length - 1}`
                  : ''}
              </span>
            </Link>
          ))}
        </div>

        <nav className="space-y-1 border-t border-border px-3 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <FileText className="h-4 w-4" />
            Documents
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {(title || subtitle) && (
          <header className="border-b border-border px-6 py-4">
            {title && <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
