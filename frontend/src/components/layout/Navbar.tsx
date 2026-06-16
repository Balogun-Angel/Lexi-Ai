import { Link } from 'react-router-dom'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface NavbarProps {
  className?: string
}

export function Navbar({ className }: NavbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
