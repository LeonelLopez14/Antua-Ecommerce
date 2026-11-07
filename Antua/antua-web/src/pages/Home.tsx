import { Hero } from '../components/home/Hero'
import { QuickCategories } from '../components/home/QuickCategories'
import { FeaturedProducts } from '../components/home/FeaturedProducts'
import { IngredientsBanner } from '../components/home/IngredientsBanner'

export default function Home() {
  return (
    <>
      <Hero />
      <QuickCategories />
      <FeaturedProducts />
      <IngredientsBanner />
    </>
  )
}
