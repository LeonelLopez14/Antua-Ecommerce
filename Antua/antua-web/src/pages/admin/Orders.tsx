import { Link } from 'react-router-dom'
import { downloadOrdersCsv, fetchAdminOrders } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDateTime, formatPrice } from '../../lib/format'
import { ORDER_STATUS_ADMIN, PAYMENT_STATUS_ADMIN, orderInfo, paymentInfo } from '../../lib/adminLabels'
import type { OrderStatusValue } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { ExportCsv } from '../../components/admin/ExportCsv'
import { DataTable } from '../../components/admin/DataTable'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { ResultCount } from '../../components/admin/ResultCount'
import { SearchField } from '../../components/admin/SearchField'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { SelectField } from '../../components/admin/fields'
import { useAdminQuery } from '../../components/admin/useAdminQuery'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormField } from '../../components/ui/FormField'
import { Pagination } from '../../components/shop/Pagination'

export default function Orders() {
  usePageMeta('Pedidos · Panel')
  const query = useAdminQuery()
  const { state, retry } = useResource(`admin-orders?${query.key}`, (signal) =>
    fetchAdminOrders(
      {
        status: query.get('status'),
        payment_status: query.get('payment_status'),
        from: query.get('from'),
        to: query.get('to'),
        q: query.get('q'),
        page: query.page,
      },
      signal,
    ),
  )

  return (
    <>
      <AdminPageHeader title="Pedidos" description="Los montos no se editan: el panel cambia el estado y guarda notas internas." />
      <div className="mb-4 grid gap-4 rounded-card bg-surface p-4 sm:grid-cols-2 xl:grid-cols-5 dark:bg-dark-card">
        <SearchField id="buscar-pedido" label="Número o email" value={query.get('q')} placeholder="1234 o ana@…" onSearch={(q) => query.set({ q })} />
        <SelectField id="estado-pedido" label="Estado" value={query.get('status')} onChange={(e) => query.set({ status: e.target.value })}>
          <option value="">Todos</option>
          {(Object.keys(ORDER_STATUS_ADMIN) as OrderStatusValue[]).map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_ADMIN[status].label}
            </option>
          ))}
        </SelectField>
        <SelectField id="pago-pedido" label="Pago" value={query.get('payment_status')} onChange={(e) => query.set({ payment_status: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(PAYMENT_STATUS_ADMIN).map(([status, info]) => (
            <option key={status} value={status}>
              {info.label}
            </option>
          ))}
        </SelectField>
        <FormField id="desde-pedido" type="date" label="Desde" value={query.get('from')} max={query.get('to') || undefined} onChange={(e) => query.set({ from: e.target.value })} />
        <FormField id="hasta-pedido" type="date" label="Hasta" value={query.get('to')} min={query.get('from') || undefined} onChange={(e) => query.set({ to: e.target.value })} />
      </div>
      <section aria-label="Exportar pedidos" className="mb-4">
        <p className="mb-2 text-sm text-text-main/80 dark:text-dark-text-secondary">
          Exporta los pedidos de los filtros de arriba (sin la búsqueda), con el rango de fechas obligatorio. Fechas en hora de Montevideo.
        </p>
        <ExportCsv
          what="pedidos"
          validate={() => (query.get('from') && query.get('to') ? null : 'Elegí las fechas "Desde" y "Hasta" para exportar.')}
          onExport={(separator) =>
            downloadOrdersCsv({
              from: query.get('from'),
              to: query.get('to'),
              status: query.get('status') || undefined,
              payment_status: query.get('payment_status') || undefined,
              separator,
            })
          }
        />
      </section>
      {state.status === 'loading' && <LoadingRows label="Cargando pedidos…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar los pedidos" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={state.data.total} one="pedido" many="pedidos" />
          </div>
          {state.data.items.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="No hay pedidos con estos filtros"
              message="Cambiá las fechas o limpiá los filtros."
              action={
                <ButtonLink to="/admin/pedidos" variant="secondary">
                  Limpiar filtros
                </ButtonLink>
              }
            />
          ) : (
            <DataTable
              caption="Pedidos"
              hideCaption
              rows={state.data.items}
              rowKey={(o) => o.id}
              columns={[
                {
                  key: 'id',
                  header: 'Pedido',
                  rowHeader: true,
                  cell: (o) => (
                    <Link to={`/admin/pedidos/${o.id}`} className="font-bold text-accent-main tabular-nums underline-offset-4 hover:underline dark:text-dark-accent-main">
                      #{o.id}
                    </Link>
                  ),
                },
                { key: 'date', header: 'Fecha', cell: (o) => <span className="whitespace-nowrap">{formatDateTime(o.created_at)}</span> },
                {
                  key: 'customer',
                  header: 'Cliente',
                  cell: (o) => (
                    <div className="min-w-0 max-w-56">
                      <p className="truncate">{o.customer}</p>
                      <p translate="no" className="truncate text-xs text-text-main/70 dark:text-dark-text-secondary">
                        {o.email ?? '—'} {o.isGuest && '(invitado)'}
                      </p>
                    </div>
                  ),
                },
                { key: 'total', header: 'Total', align: 'end', cell: (o) => formatPrice(o.total) },
                { key: 'status', header: 'Estado', cell: (o) => <StatusBadge {...orderInfo(o.status)} /> },
                { key: 'payment', header: 'Pago', cell: (o) => <StatusBadge {...paymentInfo(o.payment_status)} /> },
              ]}
            />
          )}
          <Pagination page={state.data.page} totalPages={state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
    </>
  )
}
