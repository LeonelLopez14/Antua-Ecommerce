import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchAdminProducts, fetchAdminTags } from '../../api/admin'
import { useResource } from '../../hooks/useResource'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatExactPrice, variantLabel } from '../../lib/format'
import type { AdminProductListItem } from '../../types/admin'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { DataTable, type Column } from '../../components/admin/DataTable'
import { LoadingRows } from '../../components/admin/LoadingRows'
import { ResultCount } from '../../components/admin/ResultCount'
import { SearchField } from '../../components/admin/SearchField'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { CheckboxField, SelectField } from '../../components/admin/fields'
import { useAdminQuery } from '../../components/admin/useAdminQuery'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/shop/Pagination'

export default function Products() {
  usePageMeta('Productos · Panel')
  const query = useAdminQuery()
  const sort = query.get('sort') || 'name'
  const dir = query.get('dir') === 'desc' ? 'desc' : 'asc'
  const products = useResource(`admin-products?${query.key}`, (signal) =>
    fetchAdminProducts(
      {
        q: query.get('q'),
        status: query.get('status'),
        tag: query.get('tag'),
        lowStock: query.get('lowStock') === 'true' ? 'true' : undefined,
        sort,
        dir,
        page: query.page,
      },
      signal,
    ),
  )
  const tags = useResource('admin-tags', fetchAdminTags)

  const columns: Column<AdminProductListItem>[] = [
    {
      key: 'name',
      header: 'Producto',
      rowHeader: true,
      sortHref: (direction) => query.hrefWith({ sort: 'name', dir: direction, page: '' }),
      cell: (product) => (
        <div className="flex min-w-0 items-center gap-3">
          {product.image ? (
            <img src={product.image} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="size-10 shrink-0 rounded-xl bg-accent-secondary dark:bg-dark-surface" />
          )}
          <div className="min-w-0">
            <Link to={`/admin/productos/${product.id}`} className="font-bold text-accent-main underline-offset-4 hover:underline dark:text-dark-accent-main">
              {product.name}
            </Link>
            <p translate="no" className="truncate text-xs text-text-main/70 dark:text-dark-text-secondary">
              {product.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'variants',
      header: 'Variantes y precio',
      cell: (product) =>
        product.variants.length === 0 ? (
          <span className="text-text-main/70 dark:text-dark-text-secondary">Sin variantes</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {product.variants.map((variant) => (
              <li key={variant.id} className={`whitespace-nowrap tabular-nums ${variant.is_active ? '' : 'line-through opacity-70'}`}>
                {variantLabel(variant.name)}: {formatExactPrice(variant.price)}
                {!variant.is_active && <span className="sr-only"> (inactiva)</span>}
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'end',
      sortHref: (direction) => query.hrefWith({ sort: 'stock', dir: direction, page: '' }),
      cell: (product) => (
        <div className="flex flex-col items-end gap-1">
          <span>{product.variants.filter((v) => v.is_active).map((v) => v.stock).join(' / ') || '—'}</span>
          {product.lowStock && <StatusBadge label="Stock bajo" tone="warning" />}
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      cell: (product) => product.tags.map((tag) => tag.name).join(', ') || '—',
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (product) => <StatusBadge label={product.is_active ? 'Activo' : 'Inactivo'} tone={product.is_active ? 'done' : 'muted'} />,
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Productos"
        description="Catálogo, variantes, stock e imágenes."
        actions={
          <ButtonLink to="/admin/productos/nuevo">
            <Plus aria-hidden="true" className="size-4" />
            Nuevo producto
          </ButtonLink>
        }
      />

      <div className="mb-4 grid gap-4 rounded-card bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-dark-card">
        <SearchField id="buscar-producto" label="Buscar" value={query.get('q')} placeholder="Nombre, slug o SKU…" onSearch={(q) => query.set({ q })} />
        <SelectField id="estado-producto" label="Estado" value={query.get('status')} onChange={(event) => query.set({ status: event.target.value })}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </SelectField>
        <SelectField id="tag-producto" label="Tag" value={query.get('tag')} onChange={(event) => query.set({ tag: event.target.value })}>
          <option value="">Todos</option>
          {tags.state.status === 'ready' &&
            tags.state.data.map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
        </SelectField>
        <div className="flex items-end">
          <CheckboxField
            id="stock-bajo"
            label="Solo stock bajo"
            checked={query.get('lowStock') === 'true'}
            onChange={(checked) => query.set({ lowStock: checked ? 'true' : '' })}
          />
        </div>
      </div>

      {products.state.status === 'loading' && <LoadingRows label="Cargando productos…" />}
      {products.state.status === 'error' && (
        <ErrorState headingLevel={2} title="No pudimos cargar los productos" message={products.state.message} onRetry={products.retry} />
      )}
      {products.state.status === 'ready' && (
        <>
          <div className="mb-3">
            <ResultCount total={products.state.data.total} one="producto" many="productos" />
          </div>
          {products.state.data.items.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="No hay productos con estos filtros"
              message="Probá con otra búsqueda o limpiá los filtros."
              action={
                <ButtonLink to="/admin/productos" variant="secondary">
                  Limpiar filtros
                </ButtonLink>
              }
            />
          ) : (
            <DataTable
              caption="Productos"
              hideCaption
              columns={columns}
              rows={products.state.data.items}
              rowKey={(product) => product.id}
              sort={{ key: sort, direction: dir }}
            />
          )}
          <Pagination page={products.state.data.page} totalPages={products.state.data.totalPages} hrefFor={(page) => query.hrefWith({ page: String(page) })} />
        </>
      )}
    </>
  )
}
