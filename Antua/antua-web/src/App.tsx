import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { MainLayout } from './layouts/MainLayout'
import { CheckoutLayout } from './layouts/CheckoutLayout'
import Home from './pages/Home'

const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * Rutas. Se usa un data router (createBrowserRouter) porque el checkout necesita
 * `useBlocker` para avisar antes de salir con datos sin guardar.
 * Para agregar una página: crear el componente en pages/, cargarlo con lazy()
 * y sumarlo como hijo del layout que corresponda.
 */
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/tienda', element: <Shop /> },
          { path: '/producto/:slug', element: <ProductDetail /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        element: <CheckoutLayout />,
        children: [{ path: '/checkout', element: <Checkout /> }],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
