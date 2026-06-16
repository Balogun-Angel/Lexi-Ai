import { Check, FileText, Layers, MessageSquare, Upload } from 'lucide-react'
import { processingSteps } from '../../data/mockData'
import { cn } from '../../lib/utils'

const stepIcons = [Upload, FileText, Layers, Layers, MessageSquare]

interface ProcessingStepperProps {
  activeStep: number
  progress: number
}

export function ProcessingStepper({ activeStep, progress }: ProcessingStepperProps) {
  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        {processingSteps.map((step, index) => {
          const Icon = stepIcons[index]
          const isComplete = index < activeStep
          const isActive = index === activeStep

          return (
            <div key={step.id} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      'absolute right-1/2 h-0.5 w-full -translate-y-1/2',
                      isComplete || isActive ? 'bg-primary' : 'bg-border',
                    )}
                    style={{ top: '50%', width: '100%', left: '-50%' }}
                  />
                )}
                <div
                  className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                    isComplete && 'border-primary bg-primary/20 text-primary',
                    isActive && 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan animate-pulse',
                    !isComplete && !isActive && 'border-border bg-surface-card text-text-muted',
                  )}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
              </div>
              <p
                className={cn(
                  'mt-3 max-w-[80px] text-center text-xs',
                  isActive ? 'font-medium text-accent-cyan' : 'text-text-muted',
                )}
              >
                {step.label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent-purple to-accent-cyan transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-medium text-text-secondary">{progress}%</p>
    </div>
  )
}
