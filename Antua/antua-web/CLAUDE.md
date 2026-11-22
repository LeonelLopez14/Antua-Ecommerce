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

### Entorno de desarrollo
- La base es MySQL 8 en el contenedor `antua-mysql` (`127.0.0.1:3307`). El 3306 es un MariaDB del sistema: no se toca.
- **Nunca detener, reiniciar ni modificar servicios, contenedores o procesos que no sean de este repo** (por ejemplo, otros proyectos de Docker). Si hay un conflicto de puertos, usar otro puerto o preguntar.
- **La API no aplica migraciones al arrancar** (`migrationsRun: false`, desde la Fase 13). Se aplican a mano con `pnpm migration:run`, **solo después de que el usuario las lea**. Nunca correr `migration:run` sobre `antua_db` con una migración que el usuario no aprobó. Generarlas igual fuera de `src` y revisar que no haya `DROP COLUMN` + `ADD`.

### Backend (`../antua-api`)
- El esquema se cambia solo con migraciones: `pnpm migration:generate src/database/migrations/Nombre`. Antes de tocarlo, hacer un respaldo fuera del repo. `synchronize` está apagado.
- Lo ajeno responde 404. Todo endpoint con datos propios filtra por dueño; cada uno lleva su test de ownership en `test/*.e2e-spec.ts`.
- Los e2e corren contra `antua_test`. Los logs llevan ids, nunca datos personales.

### Panel de administración (`/admin`)
- Detalle en `docs/admin.md`. Páginas en `pages/admin/`, reexportadas en `pages/admin/index.ts`: así arman un solo chunk diferido que la tienda nunca descarga. Nunca importar nada de `pages/admin` ni de `components/admin` desde la tienda.
- La seguridad está en el backend: toda ruta nueva de la API va bajo `/admin` con `@AdminController(...)`, y `test/admin-auth.e2e-spec.ts` falla si queda alguna abierta. El front solo esconde.
- El rol `admin` solo se da con `pnpm admin:create`. Nada en la web asigna roles.
- Toda escritura del panel queda en la auditoría (`AuditService.record`, en la misma transacción). Lo que tiene historial se desactiva, no se borra.
- Listas con filtros, orden y página en la URL (`useAdminQuery`), tablas con `DataTable`, resultados con `toast()` (aria-live) y formularios con `useUnsavedChanges` (en `hooks/`: también lo usa Perfil).
- Exportaciones: `components/admin/ExportCsv.tsx` con `downloadOrdersCsv`/`downloadProductsCsv`. Toda exportación nueva va en la API bajo `/admin/exports`, con tope de filas, auditoría y `textCell` (anti-fórmulas) para los textos.

### Pagos
- El estado de pago lo define solo el servidor (webhook firmado o consulta al proveedor); nunca la URL de retorno ni un monto enviado por el cliente.
- Solo credenciales de prueba. Diseño y pruebas: `docs/payments-design.md`. Las transiciones están en `payment-state.ts`.

### Acceso a pedidos de invitado
- Con el token del pedido (`X-Order-Token`, guardado en `lib/placedOrder.ts`). Nunca por email.
- El correo de confirmación lleva `/pedido/:id#t=<token>` (`pages/GuestOrder.tsx`): el token va en el fragmento, que no viaja al servidor. Nunca ponerlo en la query.

### Montos y formato
- **Ningún monto se calcula en el cliente:** subtotal, descuento, envío y total salen del backend (carrito o pedido). Se muestra "cantidad × precio unitario", nunca un total por línea calculado.
- Moneda única: **UYU con `es-UY`**, la misma que usa el backend en los pagos (`PAYMENT_CURRENCY`). Precios con `formatPrice` (o `formatExactPrice` si hay centavos) y fechas con `formatDate`/`formatDateTime` (`lib/format.ts`, el único lugar con `Intl`). Nunca otro formateador. Siempre `tabular-nums` en montos.

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

### Calidad (Fase 13)
- Medir siempre el build de producción (`pnpm qa:build && pnpm qa:preview`), nunca el servidor de desarrollo. Comandos y criterios en `docs/qa/informe-qa.md`.
- Cada UI nueva tiene que pasar `pnpm qa:a11y` (axe en 375/1280 px, claro y oscuro) sin violaciones serias, y no desbordar a 320 px.
- Nada de trucos para el puntaje (por ejemplo, detectar el navegador de Lighthouse): se arregla el problema o se documenta.
- Los textos institucionales salen de `docs/contenido-sitio.md` y cada afirmación se verifica contra la app. El contacto es `contacto@antojarte.example` (`src/data/site.ts`).
- Componentes que se abren pocas veces y pesan (drawer, modal) se cargan al abrirse (`components/layout/LazyPanels.tsx`, `lib/panels.ts`).
- Mientras corre `pnpm dev` de la API, no correr `pnpm build` de la API: borra `dist/` y la API de desarrollo se cae. Para chequear tipos, `npx tsc --noEmit`.

### Despliegue (Fase 14)
- Guía y explicación de cada pieza: `docs/despliegue.md`. Producción es `docker-compose.prod.yml` (`name: antojarte`); el `docker-compose.yml` de la raíz es de desarrollo.
- **CSP del proxy sin `unsafe-inline` ni `unsafe-eval`:** nada de `<script>` en línea en `index.html` (va en `public/`), ni `eval` o `new Function`, ni `<style>` inyectado. Imágenes solo del mismo origen, `data:` o `blob:`. Si algo nuevo lo necesita, cambiarlo en `deploy/caddy/Caddyfile` y documentar por qué. `e2e/csp.spec.ts` lo verifica.
- Marca visible: **Antojarte**, con `translate="no"` en el texto. Las claves internas (`antua.auth`, `antua.theme`, `antua.guestToken`) no se renombran: se perderían sesiones y carritos.
- Pruebas del despliegue: siempre en un proyecto aparte (`-p antojarte-test`), con puertos propios (8080/8443) y un `.env` fuera del repo. Nunca contra el entorno de desarrollo. `pnpm test:e2e:deploy` con `E2E_BASE_URL`, `E2E_API_URL`, `E2E_IGNORE_HTTPS_ERRORS=1` y `E2E_ADMIN_*`.
- En producción la API usa `antua_app` (solo datos): las migraciones van por `run --rm migrate`, a mano. La migración de `database/proposed/` no se aplica sin que el usuario la lea.
- Scripts de operación en `../scripts/` (bash comentado, LF por `.gitattributes`, con `git update-index --chmod=+x`). Antes de un commit: `../scripts/check-repo.sh`.

### Fase 15
- Bordes de controles: siempre `border-border-control` / `dark:border-dark-border-control` (3:1). `#A8B89A` es solo para rellenos y badges. `node qa/contrast.ts --check` y `e2e/control-contrast.spec.ts` lo verifican.
- Home: poster `public/hero-cookie.webp` + escena 3D solo con WebGL por hardware. Si cambia el modelo o las luces, regenerar el poster con `qa/hero-poster.ts` y actualizar `POSTER_HEIGHT_RATIO`. `localStorage['antua.force3d']` es solo para esa herramienta y para `e2e/csp.spec.ts`.
- Correos (API): plantillas en `src/mail/templates/` con `escapeHtml` en todo dato del cliente y `safeUrl` en los enlaces. Se envían después de la transacción con `OrderNotificationsService`, nunca dentro, y un fallo no puede romper el flujo.
- Para trabajar sin tocar el entorno de desarrollo del usuario (API en `nest start --watch`), usar un git worktree aparte.

### Registro de trabajo
- `docs/progreso.md`: qué se hizo en cada fase, commits, decisiones y pendientes.
- `docs/estado-frontend.md`: foto actual y cómo correr todo.
