/** Estado de carga de una lista del panel: texto para lectores de pantalla y barras de relleno. */
export function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-card bg-surface p-4 dark:bg-dark-card">
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-xl bg-text-main/10 motion-safe:animate-pulse dark:bg-dark-text-main/10" />
      ))}
    </div>
  )
}
