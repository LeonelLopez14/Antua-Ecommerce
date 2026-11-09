# Estado del frontend de Antua

Última actualización: 07/11/2026 (Fases 5 a 8). Stack: React 19 + TypeScript estricto + Vite 8 + Tailwind v4 + GSAP + Three.js/R3F + Zustand + Axios + Lucide. Gestor de paquetes: **pnpm**. Registro detallado por fase: [`progreso.md`](./progreso.md).

## Qué está hecho

| Área | Ruta / componente | Notas |
|---|---|---|
| Home | `/` | Hero con galleta 3D procedural (botón para pausar la flotación), pin y scrub con ScrollTrigger, categorías, destacados (API) y banner de ingredientes. Three/R3F va en un chunk que solo baja la Home. |
| Tienda | `/tienda`, `/tienda/:categoria` | Filtros, orden y paginación en la URL. `/tienda/sin-gluten` redirige a `/tienda?categoria=sin-gluten`. |
| Ficha | `/producto/:slug` | Galería, variante en la URL, stock, "Agregar al carrito" y "Comprar ahora". Reseñas siempre visibles, con formulario para usuarios con sesión. |
| Carrito | `CartDrawer` | Drawer con stepper, "Deshacer", cupón y totales del backend (subtotal, descuento, envío y total). |
| Cuenta | `AuthModal`, menú de cuenta | Login y registro con merge del carrito de invitado. Menú con "Mis pedidos", "Direcciones" y "Cerrar sesión". |
| Checkout | `/checkout?paso=1..4` | Dirección → Envío → Pago → Confirmación. Guest checkout, direcciones guardadas, resumen fijo, pedido sin duplicados (doble clic y recarga) y aviso al salir con datos sin guardar. El pago todavía no se cobra (ver Decisiones abiertas). |
| Mis pedidos | `/cuenta/pedidos`, `/cuenta/pedidos/:id` | Lista con estado, fecha y total. Detalle con precios snapshot; si está entregado, links para reseñar. |
| Direcciones | `/cuenta/direcciones` | Alta, edición, borrado con confirmación y predeterminada. |
| Institucionales | `/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/terminos`, `/privacidad` | **Texto provisorio** (marcado en cada página). Enlazadas desde el footer y la Navbar. |
| Errores | 404 y `RouteError` | 404 con la marca. ErrorBoundary global (errorElement del router) con "Reintentar", que también cubre un chunk que no se pudo bajar. |
| Tema | `ThemeToggle` | Sistema → claro → oscuro, guardado en localStorage. Un script en `index.html` lo aplica antes de pintar; `theme-color` acorde. |
| SEO básico | `usePageMeta` | Título y meta description por página, sin librerías. |

Reglas que respeta todo el código:
- **DESIGN.md:** tokens de diseño (los únicos hex sueltos están en `three/cookie/cookieConfig.ts` y en el script de tema de `index.html`), radios de la escala, claro y oscuro, y voseo.
- **Sección 11 de DESIGN.md:** foco visible, sin `transition: all`, imágenes con dimensiones, `Intl` para precios y fechas, y reduced motion en todas las animaciones.
- **Montos:** ninguno se calcula en el cliente.

### Calidad

- **Scripts:** `pnpm typecheck`, `pnpm lint` y `pnpm build` sin errores. El único chunk de más de 500 kB es Three/R3F (881 kB, 234 kB gzip; solo en la Home); el bundle principal pesa 404 kB (132 kB gzip).
- **Unit tests (`pnpm test`, Vitest + Testing Library):** 23 tests en 5 archivos (`authStore`, `cartStore`, `QuantityStepper`, `ProductCard` y `AuthModal`).
- **E2E (`pnpm test:e2e`, Playwright):** flujo de invitado Home → Tienda → Ficha → carrito → cupón → checkout → confirmación, en desktop y mobile.
- **Capturas** de los recorridos (375 y 1280 px, claro y oscuro) en [`docs/checks/`](./checks/). No se versionan.

## Cómo correr todo

### 1. Base de datos

```bash
docker start antua-mysql     # MySQL 8, publicado en 127.0.0.1:3307
```

El 3306 lo usa un MariaDB del sistema: no hay que tocarlo.

### 2. Backend (`antua-api`)

```bash
cd ../antua-api
cp .env.example .env         # completar DB_PASSWORD y JWT_SECRET
pnpm install
pnpm dev                     # http://localhost:3000
```

| Variable | Para qué |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL (`127.0.0.1`, `3307`, `antua_db`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Sesiones (por ejemplo `7d`) |
| `SHIPPING_FLAT_RATE` | Costo de envío fijo. **Obligatoria**: si falta o no es un número ≥ 0, la API no arranca y dice por qué. Hoy vale 1500 (provisorio). |

Tests del backend: `pnpm test` (20 de 20 suites).

### 3. Frontend (`antua-web`)

```bash
cp .env.example .env         # VITE_API_URL=http://localhost:3000
pnpm install
pnpm dev                     # http://localhost:5173
```

En desarrollo el front llama a `/api` y Vite reenvía a `VITE_API_URL`, porque la API no habilita CORS. En producción hace falta `app.enableCors({ origin: [...], exposedHeaders: ['X-Guest-Token'] })` en el backend.

| Comando | Qué hace |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | Chequeos y build de producción |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Flujo principal con Playwright. Necesita la API corriendo con los datos de prueba; levanta el front si no está corriendo. La primera vez: `pnpm exec playwright install chromium`. |

### 4. Datos de prueba

La base de desarrollo tiene datos sembrados:
- 12 productos activos y uno inactivo (`seed-*`).
- Tags `clasicas`, `sin-gluten`, `veganas`, `sin-azucar` y `packs`.
- Variantes x1, x6 y x12, y reseñas.
- Cupones `SEED10` (−10 %, mínimo $5000), `SEEDFIJO` (−$1000) y `SEEDVENCIDO`.
- Usuarios `seed.*@antua.test` con contraseña `SeedPass123!`.

Las pruebas de estas fases crearon pedidos de prueba y el usuario `cuenta.checkout@antua.test` (con el pedido #3 marcado como entregado para probar reseñas).

**Los scripts `seed.sql` y `seed-cleanup.sql` se perdieron** con el scratchpad de una sesión anterior. Si hace falta recrear la base, hay que regenerarlos y guardarlos en `antua-api/seed/`. Todo lo sembrado lleva el prefijo `seed-`/`SEED`.

## Qué falta

- **Pago online:** depende del módulo Payments, que no existe en el backend. El único punto a conectar está marcado con `TODO(payments)` en `components/checkout/PaymentStep.tsx`.
- **Perfil (datos personales):** no hay `PATCH /users/me` (`UsersController` está vacío).
- **Recuperar contraseña:** el link existe, pero solo informa; no hay endpoint.
- **Newsletter:** deshabilitada, porque no hay endpoint.
- **Contenido real:** las páginas institucionales y legales y los datos de contacto tienen texto provisorio (`TODO(contenido)` y `TODO(legal)`).
- **Información nutricional:** `Product` no tiene ese campo.

## Decisiones abiertas

1. **Pagos:** gateway real o simulado (`Documentation/Antojarte_API_NestJS.pdf` §10). Hoy el pedido queda con `payment_status: "pending"`.
2. **`SHIPPING_FLAT_RATE`:** falta el valor real (hoy 1500). El backend tampoco informa un plazo de entrega, así que el checkout muestra solo el costo.
3. **Precio que cobra `POST /orders`:** usa el precio actual de la variante, no el `unit_price_snapshot` del carrito. Si un precio cambia entre agregar y pagar, el pedido cobra distinto de lo que mostró el carrito. Hay que definir cuál manda (cambio de backend).
4. **Cupón que se quita al bajar del mínimo:** desaparece sin aviso. Para avisar, el backend tendría que informar que lo quitó.
5. **Pedidos de invitado:** no se asocian a la cuenta que se crea después.
6. **Reseñas:** no se pueden editar ni borrar (no hay PATCH ni DELETE).
7. **Filtros del lado del cliente:** `GET /products` no acepta filtros, orden ni paginación; se resuelven en `lib/shopQuery.ts`. `GET /orders` tampoco pagina.
8. **Login con Google:** fuera del alcance hasta que se decida (`TODO(auth)` en `AuthModal.tsx`).
9. **Footer oscuro vs. surface:** sigue el wireframe (`#2E2D2C`); DESIGN.md §12 lo deja abierto.
10. **JWT en localStorage:** simple para una SPA; la alternativa más segura es una cookie httpOnly (requiere cambios en el backend).
11. **Push a GitHub:** en esta máquina no hay credenciales (ni HTTPS ni `gh` ni clave SSH registrada). Los commits de `feat/fases-5-8` están solo en local.
