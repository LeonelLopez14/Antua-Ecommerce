import { RotateCcw } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title: string
  message: string
  onRetry: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-card bg-bg px-6 py-12 text-center dark:bg-dark-card">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-text-main/85 dark:text-dark-text-secondary">{message}</p>
      <Button variant="secondary" onClick={onRetry} className="mt-6">
        <RotateCcw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
    </div>
  )
}
