import { useCallback, useEffect, useState } from 'react'
import { fetchProducts, fetchTags } from '../api/products'
import { getApiErrorMessage } from '../api/client'
import type { Product, Tag } from '../types/product'

export type ShopData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[]; tags: Tag[] }

/** Catálogo y tags de la Tienda, con reintento. */
export function useShopData(): { data: ShopData; retry: () => void } {
  const [data, setData] = useState<ShopData>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setData({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchProducts(controller.signal), fetchTags(controller.signal)])
      .then(([products, tags]) => setData({ status: 'ready', products, tags }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setData({ status: 'error', message: getApiErrorMessage(error) })
      })
    return () => controller.abort()
  }, [attempt])

  return { data, retry }
}
