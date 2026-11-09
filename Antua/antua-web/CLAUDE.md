# Antua Web
Stack: React + TypeScript + Vite + Tailwind v4 + GSAP + Three.js + Zustand + Axios + Lucide.
Antes de escribir o modificar UI, leé `DESIGN.md` y respetá sus tokens, radios y reglas.
Los textos van en español con voseo. 3D solo en el hero de Home.

## Convenciones

### Estructura de `src/`
- `api/`: un archivo por recurso del backend (`cart`, `orders`, `addresses`, `products`, `auth`). Cada función documenta la ruta y los errores que devuelve, y normaliza la respuesta (decimales string → number) al modelo de `types/`. Nunca inventar rutas ni campos: leer antes `../antua-api/src` (controller, DTO y entidad).
- `types/`: dos niveles por recurso: `Api*` (tal cual responde la API) y el modelo que usa la UI.
- `stores/`: Zustand para el estado global (`authStore`, `cartStore`, `authModalStore`, `themeStore`).
- `hooks/`: `useResource` carga datos con estados (cargando, error con reintento, listo) y cancela la request; `usePageMeta` pone el título y la description por página.
- `lib/`: lógica sin React (formato, validación de formularios, traducción de errores).
- `components/<área>/`: `ui/` (primitivos: `Button`, `ButtonLink`, `Dialog`, `Drawer`, `ConfirmDialog`, `FormField`, `ErrorState`, `EmptyState`), `layout/`, `cart/`, `checkout/`, `account/`, `product/`, `auth/` y `home/`.
- `pages/`: una página por ruta (export default, carga diferida); `pages/account/` y `pages/info/` agrupan secciones.
- `layouts/`:
  - `RootLayout`: sesión, carrito, drawer y AuthModal.
  - `MainLayout`: Navbar y footer.
  - `CheckoutLayout`: solo el logo.
  - `AccountLayout`: rutas protegidas.

### Rutas
- Están en `App.tsx` (`createBrowserRouter`, necesario para `useBlocker` en el checkout).
- Para agregar una página:
  1. Crear el componente en `pages/` con `export default`.
  2. Importarlo con `lazy()`.
  3. Sumarlo como hijo del layout que corresponda.
  4. Llamar a `usePageMeta(título, descripción)`.
- Las rutas que requieren sesión van bajo `/cuenta` (`AccountLayout` abre el AuthModal; no hay redirecciones).
- El estado navegable vive en la URL: filtros (`?categoria=`), variante (`?variante=`) y paso del checkout (`?paso=`).

### Backend (`../antua-api`)
- El esquema se cambia solo con migraciones: `pnpm migration:generate src/database/migrations/Nombre`. Antes de tocarlo, hacer un respaldo fuera del repo. `synchronize` está apagado.
- Lo ajeno responde 404. Todo endpoint con datos propios filtra por dueño; cada uno lleva su test de ownership en `test/*.e2e-spec.ts`.
- Los e2e corren contra `antua_test`. Los logs llevan ids, nunca datos personales.

### Pagos
- El estado de pago lo define solo el servidor (webhook firmado o consulta al proveedor); nunca la URL de retorno ni un monto enviado por el cliente.
- Solo credenciales de prueba. Diseño y pruebas: `docs/payments-design.md`. Las transiciones están en `payment-state.ts`.

### Acceso a pedidos de invitado
- Con el token del pedido (`X-Order-Token`, guardado en `lib/placedOrder.ts`). Nunca por email.

### Montos y formato
- **Ningún monto se calcula en el cliente:** subtotal, descuento, envío y total salen del backend (carrito o pedido). Se muestra "cantidad × precio unitario", nunca un total por línea calculado.
- Precios con `formatPrice` y fechas con `formatDate` (`lib/format.ts`, `Intl` es-AR). Siempre `tabular-nums` en montos.

### Manejo de errores
- **API:**
  - `getApiErrorMessage` (`api/client.ts`) arma un mensaje legible; los 5xx no muestran el texto técnico.
  - Los errores de cada dominio se traducen en `lib/*Messages.ts` (`cartMessages`, `authMessages`, `orderMessages`, `reviewMessages`) a mensajes accionables: qué pasó y cómo seguir.
- **Avisos del backend sobre el carrito:** `warnings` en la respuesta, mostrados por `CartWarnings` (aria-live).
- **Estados de carga:** cargando con skeleton y texto `role="status"` terminado en "…"; vacío con `EmptyState`; error con `ErrorState` y reintento.
- **Formularios:**
  - Validación en línea con `FormField` (error ligado con `aria-describedby`) y foco en el primer error.
  - El botón queda habilitado hasta que arranca la request y usa `loading` (spinner y sin doble envío).
- **Errores de render y chunks que no cargan:** caen en `pages/RouteError.tsx` (errorElement del router).

### Accesibilidad y movimiento
- Diálogos: siempre `Dialog`/`Drawer`/`ConfirmDialog` (foco atrapado, Escape, devolución del foco).
- Toda animación GSAP lee `usePrefersReducedMotion` y, con reduced motion, hace solo un fundido corto. Las de Tailwind usan `motion-safe:`/`motion-reduce:`.
- Las acciones destructivas piden confirmación (`ConfirmDialog`) o dan "Deshacer".

### Tests
- `pnpm test`: Vitest + Testing Library. Los archivos van junto al código (`*.test.ts(x)`) y la API se simula con `vi.mock('../api/…')`.
- `pnpm test:e2e`: Playwright (`e2e/`). Necesita la API con los datos de prueba.

### Registro de trabajo
- `docs/progreso.md`: qué se hizo en cada fase, commits, decisiones y pendientes.
- `docs/estado-frontend.md`: foto actual y cómo correr todo.
