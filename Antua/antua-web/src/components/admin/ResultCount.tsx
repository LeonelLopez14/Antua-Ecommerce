/** "12 productos": anunciado al cambiar los filtros (aria-live), así se sabe que la lista cambió. */
export function ResultCount({ total, one, many }: { total: number; one: string; many: string }) {
  return (
    <p aria-live="polite" className="text-sm text-text-main/80 dark:text-dark-text-secondary">
      <span className="tabular-nums">{total}</span> {total === 1 ? one : many}
    </p>
  )
}
