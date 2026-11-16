import type { ReactNode } from 'react'

/** Contenedor de las páginas de recuperación de contraseña: mismo aspecto que el modal de cuenta. */
export function AuthPageShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 md:py-16">
      <div className="rounded-modal bg-surface p-6 shadow-soft sm:p-8 dark:bg-dark-surface dark:shadow-none">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-text-main/85 dark:text-dark-text-secondary">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
