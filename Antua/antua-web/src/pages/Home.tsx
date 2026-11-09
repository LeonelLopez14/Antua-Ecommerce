import { Hero } from '../components/home/Hero'
import { QuickCategories } from '../components/home/QuickCategories'
import { FeaturedProducts } from '../components/home/FeaturedProducts'
import { IngredientsBanner } from '../components/home/IngredientsBanner'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Home() {
  usePageMeta('Galletas caseras')
  return (
    <>
      <Hero />
      <QuickCategories />
      <FeaturedProducts />
      <IngredientsBanner />
    </>
  )
}
