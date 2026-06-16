import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ProcessingStepper } from '../components/upload/ProcessingStepper'
import { Button } from '../components/ui/Button'

export function ProcessingPage() {
  return (
    <AppLayout>
      <div className="relative flex min-h-[calc(100vh-0px)] flex-col items-center justify-center p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-accent-cyan/40"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 23) % 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-purple opacity-30 blur-xl" />
            <div className="relative flex h-32 w-28 items-center justify-center rounded-2xl border-2 border-accent-cyan bg-surface-card">
              <span className="text-2xl font-bold text-text-primary">PDF</span>
            </div>
          </div>

          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            Preparing your document for AI-powered search...
          </h1>
          <p className="mb-12 max-w-md text-sm text-text-muted">
            Extracting text, chunking content, and generating embeddings. This usually takes a
            minute.
          </p>

          <ProcessingStepper activeStep={3} progress={78} />

          <Link to="/chat" className="mt-12">
            <Button variant="outline">Skip to Demo Chat</Button>
          </Link>
        </div>

        <Sparkles className="absolute bottom-8 right-8 h-5 w-5 text-text-muted/50" />
      </div>
    </AppLayout>
  )
}
