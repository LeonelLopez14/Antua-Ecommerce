interface PackIllustrationProps {
  count: 1 | 6 | 12
  className?: string
}

const GRID: Record<PackIllustrationProps['count'], { cols: number; rows: number }> = {
  1: { cols: 1, rows: 1 },
  6: { cols: 3, rows: 2 },
  12: { cols: 4, rows: 3 },
}

/** Caja vista desde arriba con las galletas que trae. Ilustración plana, sin 3D. */
export function PackIllustration({ count, className }: PackIllustrationProps) {
  const { cols, rows } = GRID[count]
  const width = 96
  const height = 72
  const pad = 10
  const cellW = (width - pad * 2) / cols
  const cellH = (height - pad * 2) / rows
  const r = Math.min(cellW, cellH) * 0.4

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className={className}>
      <rect
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        rx="12"
        className="fill-accent-secondary stroke-accent-main/40 dark:fill-dark-bg dark:stroke-dark-accent-main/50"
        strokeWidth="2"
      />
      {Array.from({ length: cols * rows }, (_, i) => {
        const cx = pad + cellW * (i % cols) + cellW / 2
        const cy = pad + cellH * Math.floor(i / cols) + cellH / 2
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} className="fill-accent-main dark:fill-dark-accent-main" />
            <circle cx={cx - r * 0.3} cy={cy - r * 0.25} r={r * 0.16} className="fill-text-main dark:fill-dark-bg" />
            <circle cx={cx + r * 0.3} cy={cy + r * 0.2} r={r * 0.14} className="fill-text-main dark:fill-dark-bg" />
          </g>
        )
      })}
    </svg>
  )
}
