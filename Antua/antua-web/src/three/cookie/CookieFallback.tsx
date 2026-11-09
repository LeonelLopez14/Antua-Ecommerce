interface CookieFallbackProps {
  className?: string
}

const CHIPS: ReadonlyArray<readonly [number, number, number]> = [
  [78, 70, 9],
  [122, 62, 8],
  [100, 98, 10],
  [64, 112, 8],
  [136, 108, 9],
  [92, 140, 8],
  [128, 146, 7],
  [58, 84, 6],
  [150, 82, 6],
]

/**
 * Galleta estática para cuando no hay WebGL o mientras carga el 3D.
 * Usa tokens de la paleta (no los colores 3D de cookieConfig).
 */
export function CookieFallback({ className }: CookieFallbackProps) {
  return (
    <div aria-hidden="true" className={className}>
      <svg viewBox="0 0 200 200" className="mx-auto h-full max-h-[420px] w-full max-w-[420px]">
        <path
          d="M100 18c18 0 26 7 40 12s30 14 36 30 4 26 6 40-6 28-14 40-18 26-34 32-28 8-38 8-26-4-40-12-26-16-32-32-8-26-6-40 4-24 12-36 20-24 34-32 24-10 36-10z"
          className="fill-accent-main/85 dark:fill-dark-accent-main/90"
        />
        <path
          d="M100 30c16 0 24 6 36 11s26 12 31 26 4 23 5 35-5 24-12 35-16 22-30 28-24 7-33 7-23-4-35-11-23-14-28-28-7-23-5-35 4-21 11-31 18-21 30-28 21-9 30-9z"
          className="fill-accent-secondary/40 dark:fill-dark-text-main/15"
        />
        {CHIPS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="fill-text-main dark:fill-dark-bg" />
        ))}
      </svg>
    </div>
  )
}
