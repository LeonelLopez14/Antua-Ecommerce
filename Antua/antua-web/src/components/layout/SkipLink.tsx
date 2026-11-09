/** Primer elemento enfocable de cada layout: salta la navegación hasta el <main id="contenido">. */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only z-50 rounded-full bg-accent-main px-4 py-2 font-bold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 dark:bg-dark-accent-main dark:text-dark-bg"
    >
      Saltar al contenido principal
    </a>
  )
}
