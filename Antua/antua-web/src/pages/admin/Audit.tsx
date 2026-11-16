import { Link } from 'react-router-dom'
import { fetchAudit } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDateTime } from '../../lib/format'
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from '../../lib/adminLabels'
import type { AuditEntry } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { DataTable } from '../../components/admin/DataTable'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { ResultCount } from '../../components/admin/ResultCount'
import { SelectField } from '../../components/admin/fields'
import { useAdminQuery } from '../../components/admin/useAdminQuery'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/shop/Pagination'

const ENTITY_LINK: Record<string, (id: number) => string> = {
  product: (id) => `/admin/productos/${id}`,
  coupon: (id) => `/admin/cupones/${id}`,
  order: (id) => `/admin/pedidos/${id}`,
}

/** Resumen corto y legible del cambio (el detalle completo queda en la base). */
function summarize(entry: AuditEntry): string {
  const changes = entry.changes
  if (!changes) return ''
  if (entry.action === 'stock.move') return `${String(changes.before)} → ${String(changes.after)} (${String(changes.reason)})`
  if (entry.action === 'order.status') return `${String(changes.from)} → ${String(changes.to)}`
  const after = changes.after
  if (after && typeof after === 'object') return Object.keys(after).join(', ')
  return ''
}

export default function Audit() {
  usePageMeta('Auditoría · Panel')
  const query = useAdminQuery()
  const { state, retry } = useResource(`admin-audit?${query.key}`, (signal) =>
    fetchAudit({ entity: query.get('entity'), page: query.page }, signal),
  )

  return (
    <>
      <AdminPageHeader title="Auditoría" description="Cada cambio hecho desde el panel: quién, qué y cuándo. Sin contraseñas ni datos de pago." />
      <div className="mb-4 max-w-xs">
        <SelectField id="entidad-auditoria" label="Sobre qué" value={query.get('entity')} onChange={(e) => query.set({ entity: e.target.value })}>
          <option value="">Todo</option>
          {Object.entries(AUDIT_ENTITY_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
      {state.status === 'loading' && <LoadingRows label="Cargando la auditoría…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar la auditoría" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={state.data.total} one="registro" many="registros" />
          </div>
          {state.data.items.length === 0 ? (
            <EmptyState headingLevel={2} title="Todavía no hay cambios registrados" />
          ) : (
            <DataTable
              caption="Registro de auditoría"
              hideCaption
              rows={state.data.items}
              rowKey={(entry) => entry.id}
              columns={[
                { key: 'date', header: 'Cuándo', rowHeader: true, cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.created_at)}</span> },
                { key: 'admin', header: 'Quién', cell: (e) => e.admin?.full_name ?? 'Usuario borrado' },
                { key: 'action', header: 'Qué', cell: (e) => AUDIT_ACTION_LABEL[e.action] ?? e.action },
                {
                  key: 'entity',
                  header: 'Sobre',
                  cell: (e) => {
                    const label = `${AUDIT_ENTITY_LABEL[e.entity] ?? e.entity}${e.entity_id ? ` #${e.entity_id}` : ''}`
                    const href = e.entity_id ? ENTITY_LINK[e.entity]?.(e.entity_id) : undefined
                    return href ? (
                      <Link to={href} className="font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
                        {label}
                      </Link>
                    ) : (
                      label
                    )
                  },
                },
                { key: 'summary', header: 'Detalle', cell: (e) => <span className="break-words">{summarize(e)}</span> },
              ]}
            />
          )}
          <Pagination page={state.data.page} totalPages={state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
    </>
  )
}
