import { RotateCcw } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title: string
  /** Nivel del título según dónde se use (por defecto h3, dentro de una sección con h2). */
  headingLevel?: 2 | 3
  message: string
  onRetry: () => void
}

export function ErrorState({ title, message, onRetry, headingLevel = 3 }: ErrorStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div role="alert" className="flex flex-col items-center rounded-card bg-bg px-6 py-12 text-center dark:bg-dark-card">
      <Heading className="font-display text-2xl font-semibold">{title}</Heading>
      <p className="mt-2 max-w-md text-text-main/85 dark:text-dark-text-secondary">{message}</p>
      <Button variant="secondary" onClick={onRetry} className="mt-6">
        <RotateCcw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
    </div>
  )
}
