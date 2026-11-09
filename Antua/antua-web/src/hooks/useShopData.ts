import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { fetchProductPage, fetchTags } from '../api/products'
import { getApiErrorMessage } from '../api/client'
import { toSearchParams, type ShopQuery, type ShopResult } from '../lib/shopQuery'
import type { Tag } from '../types/product'

export type ShopData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: ShopResult; tags: Tag[] }

/**
 * Catálogo de la Tienda: los filtros, el orden y la paginación los resuelve el backend.
 * Al cambiar un filtro se mantiene la grilla anterior hasta que llega la nueva, sin parpadeos.
 */
export function useShopData(query: ShopQuery): { data: ShopData; retry: () => void } {
  const [data, setData] = useState<ShopData>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const tagsRef = useRef<Tag[] | null>(null)
  const key = toSearchParams(query).toString()

  const retry = useCallback(() => {
    setData({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const load = useEffectEvent(async (signal: AbortSignal) => {
    const [result, tags] = await Promise.all([fetchProductPage(query, signal), tagsRef.current ?? fetchTags(signal)])
    tagsRef.current = tags
    return { result, tags }
  })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then(({ result, tags }) => setData({ status: 'ready', result, tags }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setData({ status: 'error', message: getApiErrorMessage(error) })
      })
    return () => controller.abort()
  }, [key, attempt])

  return { data, retry }
}
