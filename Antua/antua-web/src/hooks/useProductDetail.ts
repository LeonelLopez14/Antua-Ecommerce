import { useCallback, useEffect, useState } from 'react'
import { fetchProduct, fetchReviews } from '../api/products'
import { getApiErrorMessage, isNotFoundError } from '../api/client'
import type { Product, Review } from '../types/product'

export type ProductState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; product: Product }

/** Las reseñas cargan aparte: si fallan, la ficha se sigue pudiendo usar. */
export type ReviewsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; reviews: Review[] }

export function useProductDetail(slug: string) {
  const [product, setProduct] = useState<ProductState>({ status: 'loading' })
  const [reviews, setReviews] = useState<ReviewsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // Al cambiar de producto, volver a "cargando" durante el render (sin un frame con datos viejos).
  const [loadedKey, setLoadedKey] = useState(`${slug}#${attempt}`)
  if (loadedKey !== `${slug}#${attempt}`) {
    setLoadedKey(`${slug}#${attempt}`)
    setProduct({ status: 'loading' })
    setReviews({ status: 'loading' })
  }

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    fetchProduct(slug, signal)
      .then((p) => setProduct(p.isActive ? { status: 'ready', product: p } : { status: 'not-found' }))
      .catch((error: unknown) => {
        if (signal.aborted) return
        setProduct(isNotFoundError(error) ? { status: 'not-found' } : { status: 'error', message: getApiErrorMessage(error) })
      })

    fetchReviews(slug, signal)
      .then((list) => setReviews({ status: 'ready', reviews: list }))
      .catch(() => {
        if (!signal.aborted) setReviews({ status: 'error' })
      })

    return () => controller.abort()
  }, [slug, attempt])

  return { product, reviews, retry }
}
