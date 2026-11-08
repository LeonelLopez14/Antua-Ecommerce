import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '../components/layout/PageSkeleton'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { SkipLink } from '../components/layout/SkipLink'

/** Layout del sitio: Navbar completa, contenido y footer. */
export function MainLayout() {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="contenido">
        {/* Las páginas se cargan en diferido: skeleton con alto reservado para que el footer no salte. */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
