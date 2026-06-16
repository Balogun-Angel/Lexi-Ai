import { Link } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import { Button } from '../components/ui/Button'
import { FeatureCard } from '../components/landing/FeatureCard'
import { landingFeatures } from '../data/mockData'
import { Sparkles } from 'lucide-react'

function AppPreview() {
  return (
    <div className="glass glow-primary overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
      <div className="flex border-b border-border bg-surface-elevated px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
      </div>

      <div className="flex h-72 bg-surface-card md:h-80">
        {/* PDF sidebar */}
        <div className="hidden w-16 border-r border-border bg-surface-elevated p-2 sm:block">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="mb-2 aspect-[3/4] rounded border border-border bg-white/5"
            />
          ))}
        </div>

        {/* PDF content */}
        <div className="relative flex-1 p-4">
          <div className="h-full rounded-lg bg-white p-4 text-left text-[8px] leading-relaxed text-gray-800">
            <p className="mb-2 font-bold">Chapter 3: Neural Networks</p>
            <p className="mb-1">
              Neural networks form the backbone of modern deep learning systems...
            </p>
            <p className="mb-1 bg-yellow-200">
              Backpropagation allows networks to adjust weights by propagating error...
            </p>
            <p>Transformer architectures have revolutionized NLP...</p>
          </div>

          <div className="absolute bottom-6 right-4 w-36 rounded-lg border border-border bg-surface-elevated p-2 shadow-lg">
            <p className="mb-1 text-[10px] font-medium text-text-primary">Citations (1)</p>
            <p className="text-[9px] leading-tight text-text-muted">
              Page 12 — Neural networks form the backbone...
            </p>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-40 border-l border-border bg-surface-elevated p-3 md:w-48">
          <p className="mb-3 text-[10px] font-semibold text-text-primary">AI Chat</p>
          <div className="mb-2 ml-auto max-w-[90%] rounded-lg rounded-br-sm bg-primary px-2 py-1.5 text-[9px] text-white">
            Summarize chapter 3
          </div>
          <div className="flex gap-1">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <div className="rounded-lg rounded-tl-sm border border-border bg-surface-card px-2 py-1.5 text-[9px] text-text-muted">
              Chapter 3 covers neural networks...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-accent-purple/10 blur-3xl" />
      </div>

      <Navbar />

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-left">
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              Understand Any PDF with AI.
            </h1>
            <p className="mb-8 max-w-lg text-lg text-text-secondary">
              Upload documents, ask questions, and get answers with citations in seconds.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/upload">
                <Button size="lg">Upload PDF</Button>
              </Link>
              <Link to="/chat">
                <Button size="lg" variant="outline">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>

          <AppPreview />
        </div>
      </section>

      <section id="features" className="relative border-t border-border bg-surface-elevated/50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
            Everything you need to understand documents
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {landingFeatures.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        © {new Date().getFullYear()} LexiAI. All rights reserved.
      </footer>
    </div>
  )
}
