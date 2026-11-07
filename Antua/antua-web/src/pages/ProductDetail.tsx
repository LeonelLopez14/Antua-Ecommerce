import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useProductDetail } from '../hooks/useProductDetail'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ProductGallery } from '../components/product/ProductGallery'
import { PurchasePanel } from '../components/product/PurchasePanel'
import { ProductInfo } from '../components/product/ProductInfo'
import { ReviewList } from '../components/product/ReviewList'
import { ErrorState } from '../components/ui/ErrorState'
import NotFound from './NotFound'
import { skeletonBar } from '../components/ui/skeleton'

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const { product, reviews, retry } = useProductDetail(slug)

  useDocumentTitle(product.status === 'ready' ? product.product.name : null)

  if (product.status === 'not-found') {
    return (
      <NotFound
        title="No encontramos esta galleta"
        message="Puede que ya no esté a la venta o que el link tenga un error. Mirá las que tenemos hoy."
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <nav aria-label="Migas de pan">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          <li>
            <Link to="/" className="rounded-sm underline-offset-4 hover:underline">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link to="/tienda" className="rounded-sm underline-offset-4 hover:underline">
              Tienda
            </Link>
          </li>
          {product.status === 'ready' && (
            <>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="min-w-0 truncate font-bold">
                {product.product.name}
              </li>
            </>
          )}
        </ol>
      </nav>

      {product.status === 'loading' && <ProductDetailSkeleton />}

      {product.status === 'error' && (
        <div className="mt-8">
          <ErrorState title="No pudimos traer esta galleta" message={product.message} onRetry={retry} />
        </div>
      )}

      {product.status === 'ready' && (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
            <ProductGallery images={product.product.images} productName={product.product.name} />
            <PurchasePanel product={product.product} />
          </div>

          <div className="mt-16 flex flex-col gap-16">
            <ProductInfo product={product.product} />
            <ReviewList state={reviews} />
          </div>
        </>
      )}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando galleta…
      </p>
      <div aria-hidden="true" className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square rounded-card bg-accent-secondary motion-safe:animate-pulse dark:bg-dark-card" />
        <div className="flex flex-col gap-4 rounded-card bg-surface p-8 dark:bg-dark-surface">
          <div className={`h-5 w-24 ${skeletonBar}`} />
          <div className={`h-10 w-3/4 ${skeletonBar}`} />
          <div className={`h-8 w-32 ${skeletonBar}`} />
          <div className={`h-4 w-full ${skeletonBar}`} />
          <div className={`h-4 w-5/6 ${skeletonBar}`} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-text-main/10 motion-safe:animate-pulse dark:bg-dark-text-main/10" />
            ))}
          </div>
          <div className={`mt-4 h-12 w-full ${skeletonBar}`} />
        </div>
      </div>
    </>
  )
}
