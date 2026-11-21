import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { MainLayout } from './layouts/MainLayout'
import { CheckoutLayout } from './layouts/CheckoutLayout'
import { AccountLayout } from './layouts/AccountLayout'
import RouteError from './pages/RouteError'
import { PageSkeleton } from './components/layout/PageSkeleton'

// Cada página es un chunk aparte. La Home trae el hero 3D (Three/R3F en su propio chunk, solo ahí).
const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Orders = lazy(() => import('./pages/account/Orders'))
const OrderDetail = lazy(() => import('./pages/account/OrderDetail'))
const GuestOrder = lazy(() => import('./pages/GuestOrder'))
const Addresses = lazy(() => import('./pages/account/Addresses'))
const Profile = lazy(() => import('./pages/account/Profile'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const CategoryRedirect = lazy(() => import('./pages/CategoryRedirect'))
const About = lazy(() => import('./pages/info/About'))
const Faq = lazy(() => import('./pages/info/Faq'))
const Contact = lazy(() => import('./pages/info/Contact'))
const Terms = lazy(() => import('./pages/info/Terms'))
const Privacy = lazy(() => import('./pages/info/Privacy'))

// Panel de administración: un solo chunk (pages/admin/index.ts) que la tienda nunca descarga.
const admin = () => import('./pages/admin')
const AdminLayout = lazy(() => admin().then((m) => ({ default: m.AdminLayout })))
const AdminDashboard = lazy(() => admin().then((m) => ({ default: m.Dashboard })))
const AdminProducts = lazy(() => admin().then((m) => ({ default: m.Products })))
const AdminProductEditor = lazy(() => admin().then((m) => ({ default: m.ProductEditor })))
const AdminTags = lazy(() => admin().then((m) => ({ default: m.Tags })))
const AdminCoupons = lazy(() => admin().then((m) => ({ default: m.Coupons })))
const AdminCouponEditor = lazy(() => admin().then((m) => ({ default: m.CouponEditor })))
const AdminOrders = lazy(() => admin().then((m) => ({ default: m.Orders })))
const AdminOrderDetail = lazy(() => admin().then((m) => ({ default: m.OrderDetail })))
const AdminReviews = lazy(() => admin().then((m) => ({ default: m.Reviews })))
const AdminUsers = lazy(() => admin().then((m) => ({ default: m.Users })))
const AdminAudit = lazy(() => admin().then((m) => ({ default: m.Audit })))

/**
 * Rutas. Se usa un data router (createBrowserRouter) porque el checkout necesita
 * `useBlocker` para avisar antes de salir con datos sin guardar.
 * Para agregar una página: crear el componente en pages/, cargarlo con lazy()
 * y sumarlo como hijo del layout que corresponda.
 */
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // ErrorBoundary global: errores de render o de carga de una página.
    errorElement: <RouteError />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/tienda', element: <Shop /> },
          { path: '/tienda/:categoria', element: <CategoryRedirect /> },
          { path: '/producto/:slug', element: <ProductDetail /> },
          {
            // Rutas protegidas: sin sesión, AccountLayout abre el AuthModal en la misma URL.
            path: '/cuenta',
            element: <AccountLayout />,
            children: [
              { index: true, element: <Navigate to="/cuenta/pedidos" replace /> },
              { path: 'pedidos', element: <Orders /> },
              { path: 'pedidos/:id', element: <OrderDetail /> },
              { path: 'direcciones', element: <Addresses /> },
              { path: 'perfil', element: <Profile /> },
            ],
          },
          { path: '/olvide-mi-contrasena', element: <ForgotPassword /> },
          { path: '/restablecer-contrasena', element: <ResetPassword /> },
          { path: '/nosotros', element: <About /> },
          { path: '/preguntas-frecuentes', element: <Faq /> },
          { path: '/contacto', element: <Contact /> },
          { path: '/terminos', element: <Terms /> },
          { path: '/privacidad', element: <Privacy /> },
          // Enlace del correo de confirmación de un invitado: /pedido/:id#t=<token>.
          { path: '/pedido/:id', element: <GuestOrder /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        // Panel (solo admins; la seguridad real está en el backend). Layout propio, sin Navbar ni footer.
        path: '/admin',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'productos', element: <AdminProducts /> },
          { path: 'productos/:id', element: <AdminProductEditor /> },
          { path: 'tags', element: <AdminTags /> },
          { path: 'cupones', element: <AdminCoupons /> },
          { path: 'cupones/:id', element: <AdminCouponEditor /> },
          { path: 'pedidos', element: <AdminOrders /> },
          { path: 'pedidos/:id', element: <AdminOrderDetail /> },
          { path: 'resenas', element: <AdminReviews /> },
          { path: 'usuarios', element: <AdminUsers /> },
          { path: 'auditoria', element: <AdminAudit /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        element: <CheckoutLayout />,
        children: [
          { path: '/checkout', element: <Checkout /> },
          { path: '/pago/exitoso', element: <PaymentResult kind="exitoso" /> },
          { path: '/pago/pendiente', element: <PaymentResult kind="pendiente" /> },
          { path: '/pago/fallido', element: <PaymentResult kind="fallido" /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
