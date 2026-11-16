import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchAdminCoupons } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDate, formatExactPrice } from '../../lib/format'
import { COUPON_STATUS_ADMIN, discountLabel } from '../../lib/adminLabels'
import type { CouponStatus } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
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
import { Pagination } from '../../components/shop/Pagination'

export default function Coupons() {
  usePageMeta('Cupones · Panel')
  const query = useAdminQuery()
  const { state, retry } = useResource(`admin-coupons?${query.key}`, (signal) =>
    fetchAdminCoupons({ q: query.get('q'), status: query.get('status'), page: query.page }, signal),
  )

  return (
    <>
      <AdminPageHeader
        title="Cupones"
        description="Los cupones usados no se borran: se desactivan."
        actions={
          <ButtonLink to="/admin/cupones/nuevo">
            <Plus aria-hidden="true" className="size-4" />
            Nuevo cupón
          </ButtonLink>
        }
      />
      <div className="mb-4 grid gap-4 rounded-card bg-surface p-4 sm:grid-cols-2 dark:bg-dark-card">
        <SearchField id="buscar-cupon" label="Buscar por código" value={query.get('q')} placeholder="VERANO…" onSearch={(q) => query.set({ q })} />
        <SelectField id="estado-cupon" label="Estado" value={query.get('status')} onChange={(e) => query.set({ status: e.target.value })}>
          <option value="">Todos</option>
          {(Object.keys(COUPON_STATUS_ADMIN) as CouponStatus[]).map((status) => (
            <option key={status} value={status}>
              {COUPON_STATUS_ADMIN[status].label}
            </option>
          ))}
        </SelectField>
      </div>
      {state.status === 'loading' && <LoadingRows label="Cargando cupones…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar los cupones" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={state.data.total} one="cupón" many="cupones" />
          </div>
          {state.data.items.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="No hay cupones con estos filtros"
              message="Creá uno nuevo o cambiá los filtros."
              action={<ButtonLink to="/admin/cupones/nuevo">Nuevo cupón</ButtonLink>}
            />
          ) : (
            <DataTable
              caption="Cupones"
              hideCaption
              rows={state.data.items}
              rowKey={(c) => c.id}
              columns={[
                {
                  key: 'code',
                  header: 'Código',
                  rowHeader: true,
                  cell: (c) => (
                    <Link to={`/admin/cupones/${c.id}`} translate="no" className="font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                      {c.code}
                    </Link>
                  ),
                },
                { key: 'discount', header: 'Descuento', align: 'end', cell: discountLabel },
                { key: 'min', header: 'Mínimo', align: 'end', cell: (c) => (c.min_order_amount ? formatExactPrice(c.min_order_amount) : '—') },
                { key: 'uses', header: 'Usos', align: 'end', cell: (c) => `${c.times_used}${c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}` },
                { key: 'dates', header: 'Vigencia', cell: (c) => <span className="whitespace-nowrap">{formatDate(c.valid_from)} – {formatDate(c.valid_until)}</span> },
                { key: 'status', header: 'Estado', cell: (c) => <StatusBadge {...COUPON_STATUS_ADMIN[c.status]} /> },
              ]}
            />
          )}
          <Pagination page={state.data.page} totalPages={state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
    </>
  )
}
