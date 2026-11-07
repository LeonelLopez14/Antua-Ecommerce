import { useState } from 'react'
import { CookieFallback } from '../../three/cookie/CookieFallback'

interface ProductImageProps {
  url: string | null
  /** Texto alternativo. Vacío si la imagen acompaña un nombre que ya está en el DOM. */
  alt?: string
  width?: number
  height?: number
  priority?: boolean
  /** Superficie sobre la que va: define el fondo del fallback para que contraste en modo oscuro. */
  surface?: 'card' | 'page'
  className?: string
}

/**
 * Foto de producto con radio 20 px y fallback ilustrado si no hay imagen o si falla la carga.
 * Sin 3D: el modelo solo vive en el hero de la Home.
 */
export function ProductImage({ url, alt = '', width = 480, height = 480, priority = false, surface = 'card', className = '' }: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = url !== null && failedUrl !== url

  return (
    <div
      className={`overflow-hidden rounded-card bg-accent-secondary ${surface === 'card' ? 'dark:bg-dark-bg' : 'dark:bg-dark-card'} ${className}`}
    >
      {showImage ? (
        <img
          src={url}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailedUrl(url)}
          className="size-full object-cover"
        />
      ) : (
        <CookieFallback className="flex size-full items-center justify-center p-[12%]" />
      )}
    </div>
  )
}
