import { CandyOff, Cookie, Gift, Vegan, WheatOff, type LucideIcon } from 'lucide-react'

export interface Category {
  slug: string
  label: string
  icon: LucideIcon
}

/** Categorías de la Home (DESIGN.md §4, "Categorías rápidas"). */
export const homeCategories: Category[] = [
  { slug: 'clasicas', label: 'Clásicas', icon: Cookie },
  { slug: 'sin-gluten', label: 'Sin gluten', icon: WheatOff },
  { slug: 'veganas', label: 'Veganas', icon: Vegan },
  { slug: 'sin-azucar', label: 'Sin azúcar', icon: CandyOff },
  { slug: 'packs', label: 'Packs', icon: Gift },
]

/** Link a la Tienda filtrada por categoría (los filtros viven en la URL, DESIGN.md §11). */
export const categoryHref = (slug: string): string => `/tienda?categoria=${encodeURIComponent(slug)}`
