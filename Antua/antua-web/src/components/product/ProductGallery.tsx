import { useState } from 'react'
import type { ProductImage as ProductImageType } from '../../types/product'
import { ProductImage } from './ProductImage'

interface ProductGalleryProps {
  images: ProductImageType[]
  productName: string
}

/** Imagen principal + miniaturas (a la izquierda en escritorio, debajo en mobile). Sin 3D. */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse">
      <ProductImage
        url={current?.url ?? null}
        alt={images.length > 0 ? `${productName}, foto ${selected + 1} de ${images.length}` : ''}
        width={800}
        height={800}
        priority
        surface="page"
        className="aspect-square w-full min-w-0 flex-1"
      />

      {images.length > 1 && (
        <ul aria-label="Fotos" className="flex gap-3 overflow-x-auto overscroll-x-contain p-1 lg:w-24 lg:shrink-0 lg:flex-col lg:overflow-visible">
          {images.map((image, i) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver foto ${i + 1} de ${images.length}`}
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
                className={`block size-20 overflow-hidden rounded-xl border-2 transition-[border-color,opacity] duration-200 ease-out lg:size-24 ${
                  i === selected
                    ? 'border-accent-main dark:border-dark-accent-main'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img src={image.url} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
