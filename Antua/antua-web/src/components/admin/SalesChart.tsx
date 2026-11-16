import { useId } from 'react'
import { formatPrice, formatShortDay } from '../../lib/format'

interface Day {
  day: string
  orders: number
  revenue: number
}

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 8, bottom: 28, left: 8 }

/**
 * Ventas por día en SVG propio (sin librerías: unos pocos kB). Accesible:
 * - el SVG tiene título y descripción con el total y el mejor día;
 * - cada barra tiene un <title> (tooltip nativo);
 * - debajo, la misma información como tabla.
 * Colores con tokens (currentColor): funciona en claro y oscuro.
 */
export function SalesChart({ days }: { days: Day[] }) {
  const titleId = useId()
  const descId = useId()
  const max = Math.max(...days.map((d) => d.revenue), 0)
  const total = days.reduce((sum, d) => sum + d.revenue, 0)
  const best = days.reduce<Day | null>((top, d) => (d.revenue > (top?.revenue ?? 0) ? d : top), null)
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / Math.max(days.length, 1)
  const barW = Math.max(slot * 0.7, 2)

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="h-auto w-full text-accent-main dark:text-dark-accent-main"
      >
        <title id={titleId}>Ventas por día, últimos {days.length} días</title>
        <desc id={descId}>
          {max === 0
            ? 'No hubo ventas en el período.'
            : `Total ${formatPrice(total)}. El mejor día fue el ${best ? formatShortDay(best.day) : ''} con ${formatPrice(best?.revenue ?? 0)}.`}
        </desc>
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          className="stroke-text-main/30 dark:stroke-dark-text-secondary/40"
          strokeWidth={1}
        />
        {days.map((d, index) => {
          const h = max === 0 ? 0 : (d.revenue / max) * innerH
          const x = PAD.left + index * slot + (slot - barW) / 2
          return (
            <rect key={d.day} x={x} y={HEIGHT - PAD.bottom - h} width={barW} height={Math.max(h, d.revenue > 0 ? 2 : 0)} rx={2} fill="currentColor">
              <title>{`${formatShortDay(d.day)}: ${formatPrice(d.revenue)} en ${d.orders} ${d.orders === 1 ? 'pedido' : 'pedidos'}`}</title>
            </rect>
          )
        })}
        {days.map((d, index) =>
          index % 7 === days.length % 7 || index === days.length - 1 ? (
            <text
              key={`label-${d.day}`}
              x={PAD.left + index * slot + slot / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-text-main/75 text-[11px] dark:fill-dark-text-secondary"
            >
              {formatShortDay(d.day)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-2 text-sm text-text-main/75 dark:text-dark-text-secondary">
        Cada barra es un día (hora de Montevideo); la altura es el monto vendido, sin pedidos cancelados.
      </figcaption>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full font-bold">Ver los datos como tabla</summary>
        <div role="region" aria-label="Ventas por día" tabIndex={0} className="mt-2 max-h-72 overflow-auto rounded-xl">
          <table className="w-full text-sm">
            <caption className="sr-only">Ventas por día</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2 text-left">Día</th>
                <th scope="col" className="py-2 text-right">Pedidos</th>
                <th scope="col" className="py-2 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day} className="border-t border-text-main/10 dark:border-dark-text-main/10">
                  <th scope="row" className="py-1.5 text-left font-normal">{formatShortDay(d.day)}</th>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
