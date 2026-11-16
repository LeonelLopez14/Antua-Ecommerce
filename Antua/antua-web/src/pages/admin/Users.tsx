import { fetchAdminUsers } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDate, formatNumber } from '../../lib/format'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { DataTable } from '../../components/admin/DataTable'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { ResultCount } from '../../components/admin/ResultCount'
import { SearchField } from '../../components/admin/SearchField'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { SelectField } from '../../components/admin/fields'
import { useAdminQuery } from '../../components/admin/useAdminQuery'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/shop/Pagination'

/** Solo lectura: el panel no cambia roles ni contraseñas (el rol admin solo se da con `pnpm admin:create`). */
export default function Users() {
  usePageMeta('Usuarios · Panel')
  const query = useAdminQuery()
  const { state, retry } = useResource(`admin-users?${query.key}`, (signal) =>
    fetchAdminUsers({ q: query.get('q'), role: query.get('role'), page: query.page }, signal),
  )

  return (
    <>
      <AdminPageHeader title="Usuarios" description="Solo lectura. Los roles se asignan desde el servidor, nunca desde la web." />
      <div className="mb-4 grid gap-4 rounded-card bg-surface p-4 sm:grid-cols-2 dark:bg-dark-card">
        <SearchField id="buscar-usuario" label="Buscar" value={query.get('q')} placeholder="Nombre o email…" onSearch={(q) => query.set({ q })} />
        <SelectField id="rol-usuario" label="Rol" value={query.get('role')} onChange={(e) => query.set({ role: e.target.value })}>
          <option value="">Todos</option>
          <option value="customer">Clientes</option>
          <option value="admin">Administradores</option>
        </SelectField>
      </div>
      {state.status === 'loading' && <LoadingRows label="Cargando usuarios…" />}
      {state.status === 'error' && <ErrorState headingLevel={2} title="No pudimos cargar los usuarios" message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={state.data.total} one="usuario" many="usuarios" />
          </div>
          {state.data.items.length === 0 ? (
            <EmptyState headingLevel={2} title="No hay usuarios con estos filtros" />
          ) : (
            <DataTable
              caption="Usuarios"
              hideCaption
              rows={state.data.items}
              rowKey={(u) => u.id}
              columns={[
                { key: 'name', header: 'Nombre', rowHeader: true, cell: (u) => <span className="font-bold break-words">{u.full_name}</span> },
                { key: 'email', header: 'Email', cell: (u) => <span translate="no" className="break-all">{u.email}</span> },
                { key: 'created', header: 'Alta', cell: (u) => <span className="whitespace-nowrap">{formatDate(u.created_at)}</span> },
                { key: 'orders', header: 'Pedidos', align: 'end', cell: (u) => formatNumber(u.orders) },
                { key: 'role', header: 'Rol', cell: (u) => <StatusBadge label={u.role === 'admin' ? 'Admin' : 'Cliente'} tone={u.role === 'admin' ? 'done' : 'neutral'} /> },
              ]}
            />
          )}
          <Pagination page={state.data.page} totalPages={state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
    </>
  )
}
