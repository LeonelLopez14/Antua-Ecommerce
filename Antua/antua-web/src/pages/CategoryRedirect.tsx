import { Navigate, useParams } from 'react-router-dom'
import { categoryHref } from '../data/categories'

/**
 * Vista por categoría del sitemap (/tienda/sin-gluten). La Tienda ya filtra por URL
 * (?categoria=), así que esta ruta redirige a esa forma canónica.
 */
export default function CategoryRedirect() {
  const { categoria = '' } = useParams()
  return <Navigate to={categoryHref(categoria)} replace />
}
