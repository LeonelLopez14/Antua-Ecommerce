# Progreso

Registro de cambios por tanda. El estado general del front está en [`estado-frontend.md`](./estado-frontend.md).

## 17/10/2026: pendientes del backend antes de las Fases 5 a 8

Cambios en `antua-api`, autorizados solo para estos cuatro puntos. Sin commits.

### a) `SHIPPING_FLAT_RATE` obligatoria y sin totales `NaN`

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `.env` (línea 8) | La variable no existía. `POST /orders` hacía `Number(undefined)`, o sea `NaN`, y guardaba un total `NaN`. | Se agregó `SHIPPING_FLAT_RATE=1500` (valor provisorio elegido por el usuario). |
| `src/config/env.validation.ts` (nuevo) | Nada controlaba el `.env` al arrancar. | `validateEnv` exige que `SHIPPING_FLAT_RATE` sea un número ≥ 0 y la convierte a `number`. Si falta, está vacía, es texto o es negativa, la API **no arranca** y muestra: `SHIPPING_FLAT_RATE es obligatoria y tiene que ser un número mayor o igual a 0 (recibido: "abc"). Definila en antua-api/.env…`. |
| `src/app.module.ts:20` | `ConfigModule.forRoot` solo leía el `.env`. | Ahora le pasa `validate: validateEnv`. Nest corre esa función antes de crear cualquier módulo. |
| `src/orders/orders.service.ts:156-165` | `Number(config.get(...))` podía ser `NaN`. | Usa `getOrThrow<number>` (ya validado) y, antes de crear la orden, verifica que subtotal, descuento, envío y total sean números finitos. Si no, responde 500 en vez de guardar basura. |
| `src/cart/cart.service.ts:399-410` | El envío era `null` cuando faltaba la variable. | Siempre es un número: 0 con el carrito vacío o la tarifa fija. Tiene el mismo control de números finitos que las órdenes. |
| `.env.example` (nuevo) | No existía. | Lista todas las variables, con `SHIPPING_FLAT_RATE` explicada. |

### b) Carrito

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `cart.service.ts:326-331` | **Merge con cupón perdía los ítems.** `save(fullUserCart)` llevaba la lista de ítems leída *antes* de mover los del invitado. TypeORM la comparaba con la base, creía que los ítems nuevos "sobraban" y les ponía `cartId = NULL`. | Se usa `update(id, { coupon })`, que escribe solo la columna del cupón y no mira los ítems. |
| `cart.service.ts:291-334` | **Merge sin transacción.** Si fallaba a mitad (por ejemplo, por stock), algunos ítems quedaban movidos y otros no. | Todo el merge corre dentro de `manager.transaction(...)`: o se aplica entero o no se aplica nada, y el invitado conserva su carrito. |
| `cart.service.ts:358-380` y `:421-430` | **El mínimo del cupón no se revalidaba.** Se aplicaba `SEED10` (mínimo $5000) y después se podía bajar el carrito a $2400 sin perder el descuento. `POST /orders` lo rechazaba recién al pagar. | `syncCoupon` corre en cada respuesta del carrito (`getCartResponse`): si el subtotal queda por debajo del mínimo, quita el cupón. `applyCoupon` usa la misma regla (`meetsCouponMinimum`). |
| `cart.service.ts:89-101` | **Se podían agregar productos inactivos**: solo se miraba `variant.is_active`, no el producto. | `addItem` también exige `product.is_active = true`. |
| `cart.service.ts:156-194` | Lo mismo al cambiar la cantidad. | `updateItem` no deja **sumar** unidades de algo inactivo; sí deja bajar la cantidad o quitarlo. |
| `cart.service.ts:197-262` | `updateItem`, `removeItem`, `applyCoupon` y `removeCoupon` repetían el armado de la respuesta, y `applyCoupon`/`removeCoupon` usaban `save()` con el carrito entero (el mismo riesgo del merge). | Todos devuelven `getCartResponse` y escriben el cupón con `update()`. `removeItem` borra con un solo `delete` filtrado por carrito. |

### c) Jest

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `package.json` (`jest.moduleNameMapper`) | 16 de 20 suites no arrancaban: Jest no entendía los imports `src/...`. | `"^src/(.*)$": "<rootDir>/$1"`. Así las 20 suites corren. |
| 16 `*.spec.ts` | Una vez resueltos los imports, fallaban porque los specs que generó el CLI no declaraban sus dependencias (repositorios, servicios). | `.useMocker(() => ({}))`: Nest pone un mock vacío en cada dependencia. Las pruebas siguen verificando lo mismo (que la clase se construye). Ninguna se borró ni se comentó. |

Resultado: **20 de 20 suites pasan.** Son pruebas mínimas: no cubren la lógica del carrito.

### d) `GET /products/:slug` sin inactivos

`products.service.ts:38`: `findOne` filtra `is_active: true`. Un producto inactivo responde 404, igual que uno inexistente (antes lo devolvía y el front lo ocultaba por su cuenta).

### Verificación

- `pnpm build`, `eslint` y `jest`: OK (20 de 20).
- curl contra la API del usuario (script `verify-fixes.sh` del scratchpad):
  - Carrito vacío: envío 0. Con un ítem de $2400: `{ subtotal: 2400, shipping: 1500, total: 3900 }`.
  - Variante de `seed-inactivo`: 404 "El producto no fue encontrado o esta inactivo."
  - `SEED10` sobre $7200 da −$720. Al bajar a $2400 el cupón se quita solo.
  - `SEEDVENCIDO`: 400. `SEEDFIJO`: −$1000.
  - Quitar un ítem inexistente: 404.
  - Invitado con 3 ítems + `SEED10` → registro → `POST /cart/merge`: el usuario queda con los 3 ítems y el cupón.
  - Merge que falla por stock: ni el carrito del usuario ni el del invitado cambian.
  - `GET /products/seed-inactivo`: 404. `seed-clasica-chips`: 200.
- La API no arranca con `SHIPPING_FLAT_RATE` en `abc`, vacía o `-5`, y muestra el mensaje de arriba.

### Hallazgos sin tocar

1. **`POST /orders` cobra el precio actual de la variante, no `unit_price_snapshot`** (`orders.service.ts:90`). Si un precio cambia entre agregar y pagar, el carrito y el pedido muestran montos distintos. Es una decisión de negocio: hay que definir qué precio manda.
2. **El cupón se quita en silencio** cuando el subtotal baja del mínimo. El front simplemente deja de mostrarlo. Si se quiere avisar ("Quitamos SEED10 porque el pedido no llega a $5000"), hay que agregar un campo a la respuesta.
3. **`seed.sql` y `seed-cleanup.sql` ya no están en el scratchpad.** Los datos sembrados siguen en la base. Si se necesitan otra vez, hay que regenerarlos y guardarlos en `antua-api/seed/`.

## 07/11/2026: Paso 0 de las Fases 5 a 8 (`docs/prompt-fases-5-8.md`)

- **Rama:** `feat/fases-5-8`, creada desde `main` (`f338c48d`).
- **Commits previos en la rama** (trabajo de las tandas anteriores que estaba sin commitear):
  - `e7f8219f` fix(api): carrito, merge y validación del envío.
  - `e313b8d4` feat(web): Fases 0 a 4 del front.
- **Push: falló.** `git push -u origin feat/fases-5-8` responde `fatal: could not read Username for 'https://github.com': No such device or address`. En esta máquina no hay credenciales HTTPS, no está instalado `gh` y la clave SSH no está registrada en GitHub (`Permission denied (publickey)`). No se forzó nada: los commits quedan locales hasta que haya credenciales.
- **Servicios:** MySQL 8 (`antua-mysql`) en `127.0.0.1:3307`; el 3306 es un MariaDB del sistema y no se toca. API en `:3000` y front en `:5173` (`pnpm dev`). `GET /products` y `GET /cart` responden 200.
- **`SHIPPING_FLAT_RATE=1500`:** sigue el valor provisorio. **Decisión abierta:** definir el costo real.
- **Checks:** front typecheck, lint y build OK (aviso conocido: el chunk de Cookie3D pesa 960 kB y se resuelve en la Fase 8). Back: build OK y Jest 20 de 20.
- **Fases anteriores:** sin errores pendientes; el último recorrido de playwright-cli pasó en 375 y 1280 px, claro y oscuro.
- **`.gitignore` del front:** se excluyen `docs/checks/` (capturas) y los artefactos de Playwright. `.agents/`, `.claude/`, `skills-lock.json` y `antua-api/.vscode/` quedan sin versionar (herramientas locales).
- **Sitemap:** está en `Design/Antojarte_Plan_Proyecto.pdf` §4. Las páginas de la Fase 7 salen de ahí: Nosotros, FAQ, Contacto, Legales (términos y privacidad) y la vista por categoría `/tienda/sin-gluten`.

### Lo que el backend ofrece (leído en `antua-api/src`)

- **`POST /orders`** (invitado o JWT): body `guest_email` (obligatorio sin JWT), `shipping_full_name`, `shipping_phone`, `shipping_street`, `shipping_city` y `shipping_postal_code`. Usa el cupón del carrito, vacía el carrito y responde `{ order, items }`. Una segunda llamada responde 400 "El carrito está vacío".
- **Consultas de pedidos:**
  - `GET /orders` y `GET /orders/:id`: requieren JWT y no paginan.
  - `GET /orders/guest/:id?email=`: pedido de invitado.
  - Los ítems traen `product_name_snapshot`, `unit_price_snapshot` y `variant`, sin `product` (no hay slug).
- **Estados de pedido:** `pending`, `preparing`, `shipped`, `delivered` y `canceled`. `payment_status` es texto libre (hoy siempre `pending`).
- **Payments:** controller y service vacíos. No hay métodos de pago ni endpoints.
- **Direcciones:** `GET/POST /addresses`, `GET/PATCH/DELETE /addresses/:id` y `PATCH /addresses/:id/default`. Campos: `label?`, `street`, `city`, `postal_code`, `country` e `is_default?`. Sin nombre ni teléfono.
- **Reseñas:** `GET/POST /products/:slug/reviews`. Para publicar hay que haber recibido un pedido con ese producto (si no, 403); el backend admite una sola por producto (409). **No hay editar ni borrar.**
- **Usuarios:** `UsersController` vacío. No hay `PATCH /users/me` (el perfil no se puede editar).
- **Plazo de envío:** el backend no lo informa. El checkout muestra solo el costo.
- **Newsletter:** no hay endpoint.

### Plan

1. **F5, datos:** `api/orders.ts` y `api/addresses.ts` con tipos y normalización de montos; ruta `/checkout?paso=1..4` y layout con la Navbar mínima.
2. **F5, pasos:**
   - Dirección: el invitado carga email, nombre, teléfono y dirección; con sesión se eligen las direcciones guardadas o "usar otra".
   - Envío: costo fijo.
   - Pago: solo el aviso, con un único TODO para Payments.
   - Confirmación.
3. **F5, pedido:**
   - `POST /orders` con el botón bloqueado durante la request.
   - `{id, email}` en `sessionStorage`: una recarga muestra el pedido sin duplicarlo.
   - Aviso al salir con datos sin guardar y errores con camino de vuelta al carrito.
4. **F6, cuenta:** rutas protegidas `/cuenta/*` (abren el AuthModal y, al iniciar sesión, vuelven a la ruta pedida) y links en el menú de cuenta.
5. **F6, contenido:**
   - Mis pedidos: lista y detalle con precios snapshot.
   - Direcciones: alta, edición, borrado con confirmación y predeterminada.
6. **F7, reseñas:** formulario en la Ficha con radios accesibles, rechazo 403 y 409 traducidos, y recarga del listado y del promedio.
7. **F7, páginas:** las páginas institucionales provisorias, `/tienda/:categoria`, la 404 y la newsletter deshabilitada.
8. **F8, rendimiento y tema:** lazy por ruta, ErrorBoundary, título y meta por página, toggle de tema sin parpadeo y Three solo en la Home.
9. **F8, tests:** Vitest + Testing Library (stores, ProductCard, stepper, AuthModal) y un spec de Playwright del flujo de invitado.
10. **Cierre de cada fase:** checks, commit, `progreso.md` y push cuando haya credenciales.

## Fase 5: Checkout (`/checkout`): commit `00b24b3d`

**Hecho**
- **Rutas:** `createBrowserRouter`, necesario para `useBlocker`.
  - `RootLayout` carga la sesión y el carrito, y monta el carrito y el AuthModal.
  - `MainLayout` es el sitio con Navbar y footer.
  - `CheckoutLayout` tiene una navbar mínima con solo el logo.
- **Pasos:** Dirección → Envío → Pago → Confirmación, con el paso en la URL (`?paso=2`); Atrás y Adelante del navegador funcionan. Sin los datos del paso 1, `?paso>1` vuelve al paso 1.
- **Invitado:** carga email, nombre y apellido, teléfono, calle, ciudad y código postal, con un link discreto "¿Ya tenés cuenta? Iniciá sesión" (no se fuerza el modal).
- **Con sesión:**
  - El nombre y el teléfono salen de la cuenta.
  - Las direcciones guardadas son radios, con la predeterminada elegida, más "Usar otra dirección".
  - Al iniciar sesión desde el checkout se hace el merge del carrito y el formulario pasa a modo cuenta.
- **Resumen:** en `accent-secondary`, idéntico en los 4 pasos. Muestra los montos del carrito (backend) y, después de confirmar, los del pedido; en mobile es colapsable arriba del formulario. Las líneas muestran "cantidad × precio unitario", sin multiplicar en el cliente.
- **Envío:** método único con el costo de `summary.shipping`.
- **Pago:** aviso de que el pago online llega pronto, con un único `TODO(payments)` en `components/checkout/PaymentStep.tsx`.
- **Confirmación:** `POST /orders` y, como resultado, número de pedido, dirección, próximos pasos y "Crear cuenta" (abre el AuthModal en Registrarme) si es invitado.
- **Sin pedidos duplicados:**
  - Doble clic: un ref, más el botón en estado `loading`.
  - Recarga: `{id, email}` va a `sessionStorage` y se lee con `GET /orders/:id` o `/orders/guest/:id?email=`.
  - El backend además rechaza un segundo pedido con el carrito vacío.
- **Formulario:**
  - Validación en línea con foco en el primer error.
  - `autocomplete` email, name, tel, street-address, address-level2 y postal-code; `inputmode` email y tel.
  - El pegado no se bloquea.
  - Aviso al salir con datos sin guardar: diálogo propio con `useBlocker`, más `beforeunload`.
- **Errores del backend:** stock, cupón, carrito vacío o producto inactivo se traducen y ofrecen "Revisar el carrito", que abre el drawer.
- **Estados:**
  - Carrito vacío: redirige a `/tienda` con un aviso.
  - Mientras carga, skeleton; si falla, error con reintento.
- **Componentes compartidos nuevos:**
  - `FormField` (antes `AuthField`, ahora lo usan el AuthModal y el checkout).
  - `Logo` y `SkipLink` ("Saltar al contenido principal").
  - `useResource`: carga con estados, reintento y cancelación.

**Verificación**
- typecheck, lint y build OK.
- playwright-cli en 375/1280 × claro/oscuro: validación (6 errores, foco en email), paso en la URL, confirmación y recarga. Pedidos #4 a #7, sin scroll horizontal.
- Pruebas a mano:
  - Doble clic en "Confirmar": un solo pedido en la base.
  - Login desde el checkout con 2 direcciones guardadas.
  - Error de stock: se bajó el stock a 0 y se restauró después.
- Capturas: `docs/checks/f5-*.png` (no se versionan).

**Decisiones tomadas**
- **Autocomplete `name` en vez de `given-name`:** el backend guarda un solo campo `shipping_full_name`.
- **Texto de la confirmación:** dice que se revisan "los precios del momento", porque `POST /orders` cobra el precio actual de la variante, no el snapshot del carrito.

**Pendientes y backend (sin tocar)**
- **Plazo de entrega:** el backend no lo informa, así que no se muestra.
- **Payments:** no existe; el pedido queda con `payment_status: "pending"`.
- **Pedidos de invitado:** no se asocian a la cuenta que se cree después (el backend no lo soporta).
- **Precio cobrado:** ver "Hallazgos sin tocar" (precio actual en vez de snapshot).

## Fase 6: Cuenta (Mis pedidos y Direcciones): commit `06e24b44`

**Hecho**
- **Rutas protegidas** `/cuenta/pedidos`, `/cuenta/pedidos/:id` y `/cuenta/direcciones` (`/cuenta` redirige a pedidos).
  - Sin sesión, `AccountLayout` abre el AuthModal y muestra "Iniciá sesión para ver tu cuenta". Al iniciar sesión se ve la misma ruta que se pidió: la URL no cambia, no hay redirección.
  - Si cerrás sesión estando en `/cuenta`, vas a la Home sin que se reabra el modal.
- **Menú de cuenta** (ícono de la Navbar): "Mis pedidos", "Direcciones" y "Cerrar sesión".
- **Mis pedidos:** número, fecha (`Intl.DateTimeFormat`), cantidad de galletas, total (`Intl.NumberFormat`) y badge de estado con ícono y texto (no depende solo del color). Tiene estados de carga, vacío y error con reintento. El backend no pagina.
- **Detalle del pedido:** ítems con el precio snapshot, cupón, totales del backend y dirección de envío.
  - Si el pedido está entregado: links "Reseñar …" a `/producto/:slug#resenas`.
  - Los ítems de `GET /orders/:id` no traen el producto, solo la variante; el slug se busca en `GET /products` por id de variante, sin inventar datos. Si el producto ya no está activo, se avisa.
- **Direcciones:**
  - Listado, alta y edición en un diálogo, con validación en línea y foco en el primer error.
  - Borrado con confirmación y "Hacer predeterminada".
  - Cambios anunciados con `aria-live`.
  - Una dirección que ya es predeterminada no se puede desmarcar desde el formulario: el backend no permite quedarse sin predeterminada a mano.
- **Componentes:** `ConfirmDialog` genérico (también lo usa el aviso de salida del checkout), `OrderStatusBadge` y `lib/orderSummary.ts` (lo comparten la confirmación del checkout y el detalle).

**Verificación**
- typecheck, lint y build OK.
- playwright-cli:
  - Ruta protegida sin sesión: abre el modal; al iniciar sesión, la lista.
  - Detalle del pedido #3, marcado como `delivered` en la base de desarrollo para probar las reseñas.
  - Direcciones: alta con validación (3 errores, foco en calle), predeterminada, edición y borrado con confirmación.
  - Cerrar sesión desde `/cuenta`: va a la Home y no abre el modal.
  - 375 px en oscuro sin scroll horizontal.

**Errores encontrados y corregidos**
- **El AuthModal se reabría después de iniciar sesión:** Suspense vuelve a correr los efectos al cargar la página hija. Ahora el layout recuerda si hubo sesión en la visita.

**Pendientes**
- **Paginación de pedidos:** no existe en el backend.
- **Perfil:** "datos personales" del sitemap. No hay `PATCH /users/me` (`UsersController` vacío): no se puede editar.
- **Pedidos de invitado:** no aparecen en la cuenta (el backend no los asocia).

## Fase 7: Reseñas y páginas que faltan: commit `833ec53d`

**Hecho**
- **Formulario de reseñas** en la Ficha (`ReviewForm`), entre el promedio y el listado:
  - Sin sesión: "Iniciá sesión para dejar tu reseña" (abre el AuthModal).
  - Calificación con 5 radios nativos (flechas del teclado) y estrellas decorativas; cada opción tiene texto para lectores ("4 estrellas: Muy rica").
  - Comentario opcional de hasta 1000 caracteres, con contador.
  - Errores del backend: 403 → "Podés reseñar esta galleta después de recibir tu pedido."; 409 → "Ya dejaste tu reseña…"; también 404 y 401.
  - Al publicar se recargan solo las reseñas (listado y promedio). Si el usuario ya tiene una reseña en el listado, se muestra "Ya dejaste tu reseña" en vez del formulario.
- **Links `/producto/:slug#resenas`** (desde "Mis pedidos"): la ficha hace scroll a la sección cuando termina de cargar.
- **Páginas del sitemap** (`Design/Antojarte_Plan_Proyecto.pdf` §4), con texto de relleno en voseo y el aviso "Texto provisorio": `/nosotros`, `/preguntas-frecuentes`, `/contacto` (sin formulario: no hay endpoint), `/terminos` y `/privacidad`. Cada una tiene su TODO de contenido o legal.
- **`/tienda/:categoria`** (vista por categoría del sitemap) redirige a `/tienda?categoria=…`, que es la forma canónica con filtros en la URL.
- **Enlaces:** footer con una columna "Antua" (las 5 páginas); Navbar con "Nosotros" y "Preguntas frecuentes" desde `lg` y todas en el menú mobile.
- **404:** identidad de la marca, "Ver galletas" y "Volver al inicio".
- **Newsletter del footer:** deshabilitada con `aria-disabled` y `readOnly`, porque no hay endpoint (`TODO(newsletter)` en `NewsletterForm.tsx`).
- **Foco en el footer oscuro:** visible en links, input y botón.

**Verificación**
- typecheck, lint y build OK.
- playwright-cli:
  - Reseñas: validación sin estrellas (foco en el primer radio), flechas del teclado y 403 en un producto no comprado.
  - Publicación en `seed-clasica-chips` (pedido #3 entregado): el promedio pasó de 4,5 (2 reseñas) a 4,7 (3) y, al recargar, aparece "Ya dejaste tu reseña".
  - Las 5 páginas con su título, la redirección por categoría y la 404.
  - FAQ y footer en 375 px oscuro, sin scroll horizontal.

**Decisión pendiente**
- **Editar o borrar la propia reseña:** el backend no lo permite. Solo existen `GET/POST /products/:slug/reviews`; no hay PATCH ni DELETE.

## Fase 8: Pulido, rendimiento, tests y documentación: commit `dd63af3d`

**Rendimiento**
- Todas las páginas cargan en diferido (`React.lazy`), también la Home, con `PageSkeleton` como fallback de Suspense.
- `GltfCookie` (drei y el loader GLTF, 73 kB) solo se baja si hay un `.glb`. ScrollTrigger pasó a `lib/scrollTrigger.ts` y viaja en el chunk de la Home.
- Chunks:

  | Chunk | Antes | Después |
  |---|---|---|
  | Principal | 447 kB (150 kB gzip) | 406 kB (133 kB gzip) |
  | Three/R3F (solo en la Home) | 960 kB | 881 kB (234 kB gzip) |

- `chunkSizeWarningLimit: 900` en `vite.config.ts`, con el motivo comentado: así cualquier otro chunk grande sigue avisando. El build no tiene warnings.

**Estructura y meta**
- `RouteError` como `errorElement` de la ruta raíz: ErrorBoundary global con "Reintentar". Detecta los chunks que no cargan después de un deploy.
- `usePageMeta(title, description)` reemplaza a `useDocumentTitle` en todas las páginas: título y meta description sin librerías.
- Favicon nuevo: una galleta con colores de la paleta, en lugar del de Vite. Se borró `public/icons.svg`, que quedaba del template.

**Tema**
- `ThemeToggle` en la Navbar (sistema → claro → oscuro) y `stores/themeStore.ts`.
  - Clases `.dark`/`.light` en `<html>` (las usa `@custom-variant dark`).
  - Preferencia en localStorage dentro de try/catch.
  - `theme-color` leído de los tokens `--color-bg` y `--color-dark-bg`.
- Un script mínimo en `index.html` aplica el tema antes del primer pintado, para que no parpadee.

**Accesibilidad**
- Botón para pausar la flotación de la galleta 3D (WCAG 2.2.2), con `aria-pressed`; el giro con el scroll sigue.
- `EmptyState` y `ErrorState` aceptan `headingLevel`. Las pantallas de error del checkout y del detalle de pedido tienen h1 → h2, sin saltos.
- Skip link "Saltar al contenido principal" en los dos layouts.
- Reduced motion revisado en todas las animaciones GSAP (Hero, CookieRig, Dialog y AuthModal) y en el 3D: la galleta queda estática.

**Tests**
- Vitest + Testing Library (`pnpm test`): 23 tests en 5 archivos.
  - `authStore`: sesión, persistencia, token vencido (401) contra un error de red.
  - `cartStore`: reemplazo del estado, ítems pendientes, errores del backend y merge.
  - `QuantityStepper`, `ProductCard` y `AuthModal`: tabs con teclado, validación con foco, 401 traducido, login con merge y cierre.
- Playwright (`pnpm test:e2e`, `e2e/guest-checkout.spec.ts`): Home → Tienda → Ficha → agregar → drawer → cupón → checkout → confirmación como invitado, en desktop y mobile.
- Se instaló Chromium para Playwright con `pnpm exec playwright install chromium` (queda en la caché del usuario, no en el repo).

**Limpieza**
- Sin `any`, `@ts-ignore` ni `console.log`. El `console.warn` del contrato del carrito queda solo en desarrollo.
- Todos los TODO tienen etiqueta y ubicación: `payments`, `api`, `contenido`, `legal`, `auth`, `newsletter` y `blender`.
- Sin archivos sin uso. Se quitaron 6 exports internos que nadie importaba.
- El helper `galletas(n)`, que estaba repetido en 3 lugares, pasó a `lib/format.ts`.
- `.env.example` (front y back) lista todas las variables que lee el código.

## Check final (07/11/2026)

1. **Front:** typecheck, lint y build sin errores ni warnings; 23 de 23 unit tests y 2 de 2 e2e. **Back:** build y 20 de 20 suites.
2. **playwright-cli (`final-flow.sh`)** en 375 y 1280 px, claro y oscuro: Home → Tienda → Ficha → carrito → cupón SEEDFIJO → checkout como invitado → confirmación → registro desde la confirmación → Mis pedidos → Direcciones → reseña → compra con sesión → detalle del pedido.
   - Todo OK en las 4 combinaciones, sin scroll horizontal. Capturas en `docs/checks/final-*.png`.
   - "Mis pedidos" queda vacío para la cuenta nueva: el pedido de invitado no se asocia (límite del backend).
   - La reseña responde 403 con su mensaje, porque no hay pedido entregado. La publicación exitosa se probó en la Fase 7 con un pedido entregado.
   - El único error de consola es ese 403, que el navegador registra solo.
   - Hay un aviso de `THREE.Clock` deprecado que viene de R3F, no del código del proyecto.
3. **/web-interface-guidelines sobre `src/`:** 3 hallazgos, corregidos.
   - `Faq.tsx`: comillas rectas.
   - `AddressFormDialog.tsx`: checkbox sin `name`.
   - `ReviewForm.tsx`: textarea sin `autocomplete="off"`.
4. **DESIGN.md:**
   - Hex sueltos solo en `three/cookie/cookieConfig.ts` (3D) y en el script de tema de `index.html`.
   - Sin colores fuera de la paleta, sin `transition: all` y sin tuteo.
   - El único `outline-none` es el del título del paso del checkout (destino del foco programático) y tiene reemplazo: el subrayado.
   - `rounded-sm` solo en links de texto, para el contorno de foco.
5. **Documentación:** `docs/estado-frontend.md` actualizado y `CLAUDE.md` con las convenciones (estructura, rutas, montos, errores, accesibilidad y tests).

## 08/11/2026: Fases 9 a 11 (`docs/prompt-fases-9-11.md`)

### Paso 0: estado base

- **Rama:** `feat/fases-9-11`, creada desde `feat/fases-5-8` (`1575284c`). Push por SSH funcionando.
- **Línea base:** front typecheck, lint, build y 23 unit tests OK; back build y 20 de 20 suites OK.
- **Servicios:** MySQL en `127.0.0.1:3307`, API en `:3000`, front en `:5173`.
- **Respaldo previo a tocar el esquema:** `~/respaldos/antua_db_20261108_211922.sql` (fuera del repo).

### Migraciones (`5d3ca0d6`)

| Archivo | Qué faltaba | Qué cambió y por qué |
|---|---|---|
| `src/app.module.ts` | `synchronize: true` adaptaba la base sola; si una entidad perdía una columna, la borraba con sus datos. | `synchronize: false` y `migrationsRun: true`: el esquema cambia solo con migraciones versionadas, que se aplican al arrancar. |
| `src/app.module.ts` | `logging: true` escribía cada query con sus parámetros (emails, direcciones). | Solo errores, avisos y migraciones. |
| `src/database/data-source.ts` | El CLI de TypeORM no tenía configuración. | Da acceso a `pnpm migration:run`, `:revert` y `:show`. |
| `src/database/migrations/1794000000000-InitialSchema.ts` | No había historial del esquema. | Esquema completo. En una base que ya tiene las tablas no hace nada (solo queda registrada) y no se puede revertir. |
| `test/helpers.ts`, `test/setup-env.ts` | Los e2e usaban la base real. | Corren contra `antua_test`, con un candado que impide vaciar cualquier otra base. |

Antes de adoptar migraciones se verificó con `schema:log` que la base coincidía con las entidades.

### 9.1 Precio cobrado

**Qué fallaba** (`src/orders/orders.service.ts`): `POST /orders` cobraba `variant.price` (precio de hoy) aunque el carrito hubiera mostrado otro.

**Qué cambió:**
- Dentro de la transacción se compara `cart_item.unit_price_snapshot` contra el precio actual, en centavos para evitar errores de decimales.
- Si alguno cambió se lanza `PriceChangedError`. Lanzar un error dentro de `dataSource.transaction` deshace todo: no se crea el pedido ni se descuenta stock.
- *Después* de la transacción, `CartService.updatePriceSnapshots` guarda los precios nuevos y se responde 409 con `code: 'PRICE_CHANGED'` y `changes`. Tiene que ser después: dentro se revertiría junto con lo demás.
- También se rechaza un producto o variante que dejó de estar a la venta entre agregar y confirmar.
- **Front:** `ConfirmStep` muestra "El precio de X cambió de $A a $B", el resumen se recarga y el botón pasa a "Confirmar con los precios nuevos".

**Tests:** `test/orders.e2e-spec.ts` (precio igual, 409 sin pedido ni descuento de stock, confirmación con el precio nuevo, producto inactivo).

```bash
# Con $T = token de invitado y un ítem en el carrito, cambiar el precio en la base y:
curl -i -X POST localhost:3000/orders -H "Content-Type: application/json" -H "X-Guest-Token: $T" \
  -d '{"guest_email":"a@b.test","shipping_full_name":"Ana","shipping_phone":"1155554444","shipping_street":"Calle 1","shipping_city":"Montevideo","shipping_postal_code":"11200"}'
# → 409 {"code":"PRICE_CHANGED","changes":[{"productName":"…","oldPrice":1000,"newPrice":1200,…}]}
```

### 9.2 Pedidos de invitado → cuenta

**Qué faltaba:** un pedido de invitado no se podía pasar a una cuenta. Además, `GET /orders/guest/:id?email=` mostraba nombre, teléfono y dirección a quien supiera un id (son consecutivos) y un email.

**Mecanismo elegido y por qué:** un token aleatorio de 256 bits por pedido, generado en `POST /orders`.
- Vincular por email está prohibido a propósito: el email no se verifica, así que cualquiera podría registrarse con uno ajeno y quedarse con esos pedidos.
- El token del carrito no sirve: se borra con el carrito y no identifica un pedido puntual.
- El token de pedido solo lo tiene el navegador que hizo la compra. Se entrega una vez (`accessToken` en la respuesta) y en la base queda solo su hash SHA-256 (si la base se filtra, no sirve para reclamar nada). Es de un solo uso, vence a las 24 h y viaja en un header (`X-Order-Token`), no en la URL, para no quedar en logs ni en el historial.

| Archivo | Qué cambió |
|---|---|
| `src/common/secure-token.ts` (nuevo) | Genera tokens, los hashea y los compara en tiempo constante. |
| `src/orders/entities/order.entity.ts` | Columna `guest_access_token_hash`, con `select: false` y `@Exclude`: nunca sale en una respuesta. |
| `src/orders/orders.service.ts` | `createOrder` genera el token. `findGuestOrder` lo exige. `claimGuestOrder` vincula y lo borra; todas las fallas responden el mismo 404, para no revelar qué pedidos existen. |
| `src/orders/orders.controller.ts` | `GET /orders/guest/:id` con `X-Order-Token` (ya no acepta `?email=`) y nuevo `POST /orders/:id/claim`. |
| Migración `GuestOrderAccessToken` | Agrega la columna (no toca datos). Los pedidos de invitado viejos no tienen token y no se pueden reclamar. |
| Front: `pages/Checkout.tsx`, `lib/placedOrder.ts`, `api/orders.ts` | El token vive en `sessionStorage`. Al crear la cuenta (o iniciar sesión) desde la confirmación, se reclama ese pedido y se avisa con `aria-live`. |

**Tests** (`test/orders.e2e-spec.ts`): no se filtra el hash; el email solo no alcanza; registrarse con el email de la víctima no da acceso; un token inventado falla; el reclamo correcto funciona una sola vez y el token muere; vencido a las 24 h.

```bash
# Con $ID y $ORDER_TOKEN (accessToken de POST /orders) y $JWT del usuario:
curl -i localhost:3000/orders/guest/$ID -H "X-Order-Token: $ORDER_TOKEN"              # 200
curl -i localhost:3000/orders/guest/$ID                                               # 404
curl -i -X POST localhost:3000/orders/$ID/claim -H "Authorization: Bearer $JWT" -H "X-Order-Token: $ORDER_TOKEN"  # 200 la primera vez, 404 después
```

### 9.3 Cupón retirado y 9.4 Plazo de envío

**9.3. Qué fallaba:** `syncCoupon` quitaba el cupón sin decir nada. **Qué cambió** (`src/cart/cart.service.ts`):
- `syncCoupon` devuelve un aviso y todas las respuestas del carrito traen `warnings: [{ code, message, couponCode, minAmount }]`. Se informa una sola vez, en la respuesta que retiró el cupón.
- **Front:** `CartWarnings` lo muestra en el drawer y en el checkout dentro de una región `aria-live="polite"` siempre montada. Una recarga del carrito no borra el aviso pendiente; la próxima acción sí.

**9.4. Qué faltaba:** el backend no informaba un plazo. **Qué cambió:**
- `SHIPPING_ETA_DAYS` (entero de 1 a 60), validada en `src/config/env.validation.ts`. Es opcional: vacía, no se muestra un plazo; inválida, la API no arranca.
- `summary.shippingEtaDays` en el carrito y columna `orders.shipping_eta_days` (migración `OrderShippingEta`), que congela el plazo del momento de la compra.
- **Front:** se ve en el drawer, en el resumen del checkout, en el paso Envío y en el detalle del pedido.

**Tests:** `test/cart.e2e-spec.ts`, `src/config/env.validation.spec.ts` y `cartStore.test.ts`.

```bash
curl -s localhost:3000/cart -H "X-Guest-Token: $T" | jq '{warnings, eta: .summary.shippingEtaDays}'
```

### 9.5 Filtros, orden y paginación en `GET /products`

**Qué faltaba:** el backend devolvía todo y el front filtraba en `lib/shopQuery.ts`.

**Qué cambió:**
- `src/products/dto/product-filter.dto.ts`: `tags` (varias, repetidas o separadas por coma), `minPrice`, `maxPrice`, `sort`, `page` y `limit` (máximo 48), validados. `sort` es una whitelist: el orden nunca se arma con texto del cliente.
- `src/products/products.controller.ts`: **sin parámetros responde el array de siempre**; con alguno, una página.
- `src/products/products.service.ts`, `findPage`: consulta con QueryBuilder. El precio "desde" (el menor entre el base y las variantes activas) se calcula en SQL para poder filtrar y ordenar por él. Primero se piden los ids de la página y después sus relaciones, porque paginar con joins a variantes contaría filas de más. Si se pide una página que no existe, se usa la última.
- `facets`: conteo por categoría y rango de precios de todo el catálogo activo, que antes el front sacaba de la lista completa.
- **Front:** `useShopData` llama al backend con la misma URL (`?categoria=…&orden=…&pagina=…`). Al filtrar se mantiene la grilla anterior hasta que llega la nueva.

**Tests:** `test/products.e2e-spec.ts` (compatibilidad, paginación, varias categorías, precio, orden, facetas, parámetros inválidos → 400).

```bash
curl -s "localhost:3000/products?tags=veganas&tags=packs&sort=price_desc&page=1&limit=9" | jq '{total, totalPages, facets}'
curl -i "localhost:3000/products?limit=1000"   # 400
```

### 9.6 Reseñas: editar y borrar la propia

**Qué faltaba:** no se podían editar ni borrar. Además, `GET /products/:slug/reviews` devolvía el usuario completo, con email y teléfono.

**Qué cambió** (`src/reviews/`):
- `PATCH` y `DELETE /products/:slug/reviews/:id` con JWT. `findOwnReview` busca por id, producto **y** autor: para cualquier otra persona la reseña "no existe" (404).
- Las reglas de crear no cambian: comprado y entregado (403), y una por usuario y producto (409).
- `toPublicReview`: del autor solo se publican `id` y `full_name`.
- **Front:** en la reseña propia aparecen "Editar" y "Borrar" (con confirmación). `ReviewsSection` coordina formulario, listado y diálogo; al guardar se recargan el listado y el promedio.

**Tests:** `test/reviews.e2e-spec.ts` (sin email en el listado, reglas de creación, autora edita y borra, otra persona recibe 404, sin sesión 401).

```bash
curl -i -X PATCH  localhost:3000/products/$SLUG/reviews/$ID -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"rating":4,"comment":"Muy rica"}'
curl -i -X DELETE localhost:3000/products/$SLUG/reviews/$ID -H "Authorization: Bearer $JWT"   # 204; con el JWT de otra persona, 404
```

### 9.7 Perfil

**Qué faltaba:** `UsersController` estaba vacío.

**Qué cambió:**
- `GET` y `PATCH /users/me` (`src/users/users.controller.ts`): solo nombre y teléfono. El `ValidationPipe` con `whitelist` descarta cualquier otro campo, como `email`. El hash no sale porque `password_hash` lleva `@Exclude` y hay un interceptor global que lo aplica.
- `POST /auth/change-password` (`src/auth/auth.service.ts`): pide la actual y aplica la política (`src/common/password-policy.ts`: 8 a 72 caracteres, una letra y un número; bcrypt ignora lo que pase de 72 bytes).
- **Sesiones:** columna `users.password_changed_at` (migración `UserPasswordChangedAt`). `JwtStrategy` rechaza los JWT emitidos antes del cambio, así que una sesión robada deja de servir. El endpoint devuelve un JWT nuevo para la sesión actual.
- **Login:** si el email no existe se compara igual contra un hash descartable, para que el tiempo de respuesta no revele qué cuentas existen.
- **Front:** `/cuenta/perfil` con datos personales y cambio de contraseña, con validación en línea y foco en el primer error.

**Tests:** `test/account.e2e-spec.ts` (sin datos sensibles, solo nombre y teléfono, validación, contraseña actual obligatoria, política, sesión vieja invalidada).

```bash
curl -s localhost:3000/users/me -H "Authorization: Bearer $JWT"
curl -s -X PATCH localhost:3000/users/me -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"full_name":"Ana","phone":"099 123 456"}'
curl -s -X POST localhost:3000/auth/change-password -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"currentPassword":"…","newPassword":"NuevaClave123"}'
```

### Corrección: fechas en UTC (`5248da47`)

**Qué fallaba:** MySQL guarda en UTC, pero el driver interpretaba cada fecha como hora local (UTC−3). Los pedidos y reseñas mostraban una fecha 3 horas adelantada y los vencimientos se corrían. Apareció probando el vencimiento de los tokens.
**Qué cambió:** `timezone: 'Z'` en `src/app.module.ts` y `src/database/data-source.ts`. No hizo falta migrar datos, porque esas fechas las escribe MySQL en UTC.

### 9.8 Recuperación de contraseña

**Qué faltaba:** el link "¿Olvidaste tu contraseña?" solo mostraba un texto.

**Qué cambió:**

| Archivo | Qué hace |
|---|---|
| `src/auth/entities/password-reset-token.entity.ts` + migración `PasswordResetTokens` | Tabla de pedidos con el hash del token (nunca el token), vencimiento y fecha de uso. |
| `src/auth/password-reset.service.ts` | Token de 256 bits que vence en 60 minutos y sirve una vez. Un link nuevo anula los anteriores. Máximo 3 pedidos por cuenta y por hora. |
| `src/auth/auth.controller.ts` | `POST /auth/forgot-password` y `POST /auth/reset-password`. |
| `src/mail/*` | `MailService` con la interfaz `MailTransport`. El transporte de desarrollo escribe el mail en el log (destinatario enmascarado) y **en producción se niega a funcionar**, para no dejar links en los logs. Para conectar un proveedor real, se implementa `MailTransport` y se registra en `mail.module.ts`. |
| Front: `/olvide-mi-contrasena`, `/restablecer-contrasena?token=…` | Formularios con validación en línea; el link del AuthModal apunta acá. |

**No revela cuentas:** `forgot-password` responde igual exista o no el email, y el trabajo corre en segundo plano, así que tampoco lo revela el tiempo de respuesta.
**Un solo uso, también con pedidos simultáneos:** `UPDATE … WHERE used_at IS NULL` deja ganar a uno solo. Usar el link actualiza `password_changed_at`, lo que además cierra las sesiones abiertas.

**Tests:** en `test/account.e2e-spec.ts` (misma respuesta, solo hash, un uso, vencido, inventado, contraseña débil, link nuevo anula, límite por hora).

```bash
curl -s -X POST localhost:3000/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"a@b.test"}'
# El link aparece en el log de la API.
curl -i -X POST localhost:3000/auth/reset-password -H "Content-Type: application/json" -d '{"token":"…","newPassword":"NuevaClave123"}'
```

### 9.9 Newsletter

**Qué faltaba:** el formulario del footer estaba deshabilitado por falta de endpoint.
**Qué cambió:** módulo `src/newsletter/` con la tabla `newsletter_subscribers` (email único; migración `NewsletterSubscribers`) y `POST /newsletter/subscribe`. Usa `INSERT IGNORE`: un email repetido no duplica ni da error, y la respuesta es la misma, así no se puede averiguar quién está suscripto. El front habilita el formulario con validación y aviso `aria-live`.

**Tests:** `test/newsletter.e2e-spec.ts`.

```bash
curl -s -X POST localhost:3000/newsletter/subscribe -H "Content-Type: application/json" -d '{"email":"a@b.test"}'
```

### 9.10 Endurecimiento básico

| Hallazgo | Riesgo | Corrección |
|---|---|---|
| `POST/PATCH/DELETE /products` y `/tags` no tenían guard | **Crítico:** cualquiera podía crear, cambiar o borrar productos | `src/common/admin-key.guard.ts`: exige `X-Admin-Key`. Sin `ADMIN_API_KEY` configurada, nadie puede usarlas. Queda hasta que exista un panel con roles. |
| `GET /products/:slug/reviews` exponía email y teléfono del autor | Datos personales | Corregido en 9.6: solo id y nombre. |
| `GET /orders/guest/:id?email=` | Datos personales con id consecutivo + email | Corregido en 9.2: exige el token del pedido. |
| Sin límite de intentos | Fuerza bruta de contraseñas y cupones | `@nestjs/throttler`: 300 por minuto por IP en general, y límites propios en login, registro, recuperación, cambio de contraseña, cupones, newsletter y pedidos de invitado. |
| Sin cabeceras de seguridad | Clickjacking, sniffing | `helmet` en `src/app.setup.ts`. |
| Sin CORS configurable | El front en otro dominio no podría llamar a la API, y nadie debe poder ponerle `*` | `CORS_ORIGINS` (lista). La validación rechaza `*`; vacía, no se habilita CORS. |
| Contraseñas de 8 caracteres sin más | Claves triviales | `src/common/password-policy.ts`. |
| JWT sin validar al arrancar | Un `JWT_EXPIRES_IN` vacío emitiría tokens eternos | `src/config/env.validation.ts` exige secreto de 32+ caracteres y vencimiento con formato. |
| `POST /cart/items` aceptaba `quantity: 1.5` | Totales con cantidades imposibles | `@IsInt`, `@Max(999)`. |
| Textos sin largo máximo en pedidos, direcciones y cupones | Error 500 de la base | `@MaxLength` según cada columna. |
| Log de queries con parámetros | Datos personales en logs | Corregido en el commit de migraciones. |
| Login distinguible por tiempo | Revela qué cuentas existen | Corregido en 9.7. |

**Ownership revisado:** carrito (por ítem), pedidos, direcciones y reseñas filtran siempre por dueño; todo lo ajeno responde 404. Cubierto en `test/security.e2e-spec.ts` y `test/reviews.e2e-spec.ts`.

**Aceptado, sin cambiar:** `POST /auth/register` responde 409 si el email ya existe. Revela cuentas, pero evitarlo requiere verificación por email; queda como decisión.

**Front:** el 429 se traduce a "Hiciste muchos intentos seguidos…".

```bash
curl -i -X POST localhost:3000/tags -H "Content-Type: application/json" -d '{"name":"x","slug":"x"}'   # 403
curl -I localhost:3000/products | grep -i x-content-type-options
```

## Fase 10: Pagos con Mercado Pago (Checkout Pro)

El diseño, lo verificado y cómo probar de punta a punta están en [`payments-design.md`](./payments-design.md). **No se abrió ningún túnel ni se usaron credenciales.**

**Qué faltaba:** `PaymentsController` y `PaymentsService` estaban vacíos.

**Cambios de backend, en simple:**

| Archivo | Qué hace |
|---|---|
| `src/payments/payment-state.ts` | Una función pura decide cómo cambia el estado de pago. Al ser pura, cada transición se prueba sin base de datos. |
| `src/payments/payment-provider.ts` | Interfaz del proveedor: crear checkout y consultar un pago. Permite cambiar Mercado Pago por uno simulado. |
| `src/payments/mercadopago.provider.ts` | Usa el SDK oficial. Manda una sola línea con el total del pedido y solo acepta la URL de pruebas (`sandbox_init_point`). |
| `src/payments/webhook-signature.ts` | Verifica la firma con el validador del SDK oficial, en lugar de una copia propia. |
| `src/payments/payments.service.ts` | `startPayment` toma el monto del pedido, nunca del cliente. `syncPayment` consulta el pago real, bloquea la fila del pedido, valida monto y moneda, y es idempotente. |
| `src/payments/payment-expiration.service.ts` | Cada 10 minutos cancela los pedidos vencidos y devuelve stock y cupón, en una transacción. |
| `src/payments/payments.controller.ts` | `GET /payments/config`, `POST /orders/:id/payment`, `POST /orders/:id/payment/retry`, `GET /orders/:id/payment` y `POST /payments/webhook`. |
| `src/payments/entities/payment.entity.ts` + migración `PaymentsModule` | Una fila por pago (id del proveedor único, estado, monto, moneda). Un pedido admite varios intentos. No se borró ninguna columna. |
| `src/orders/*` | `payment_expires_at`: hasta cuándo se reserva el stock. |
| `src/config/env.validation.ts` | Sin credenciales: deshabilitado con aviso. Credenciales incompletas o URLs no públicas: no arranca. En producción: no arranca. |
| `scripts/simulate-mp-webhook.ts` | `pnpm payments:simulate <pedido> <estado>`: manda un evento firmado a una API en modo simulado. |

**Front:**
- `PaymentStep` real: crea el pedido, pide el checkout y redirige; no tiene ni tendrá campos de tarjeta.
- Si el checkout no se puede abrir, el pedido queda registrado y se ofrece reintentar.
- `/pago/exitoso`, `/pago/pendiente` y `/pago/fallido`: **el mensaje sale del estado del servidor, nunca de la URL.**
- Estado de pago y "Reintentar el pago" en el detalle del pedido.
- El invitado puede crear la cuenta y vincular el pedido también desde la página de retorno.

**Tests:** `test/payments.e2e-spec.ts` (14: monto ignorado, ownership, firma, idempotencia también simultánea, discrepancia de monto, rechazo y reintento, retorno que no marca nada, vencimiento con stock y cupón, pago tardío), `payment-state.spec.ts`, `webhook-signature.spec.ts` y `env.validation.spec.ts`.

```bash
# API con PAYMENTS_SIMULATED=true y MP_WEBHOOK_SECRET definido:
curl -s localhost:3000/payments/config
curl -s -X POST localhost:3000/orders/$ID/payment -H "X-Order-Token: $ORDER_TOKEN"
pnpm payments:simulate $ID approved
curl -s localhost:3000/orders/$ID/payment -H "X-Order-Token: $ORDER_TOKEN"
```

## Fase 11: Cierre

**Hecho**
- **READMEs** de la raíz, `antua-api` y `antua-web`: qué es, requisitos, cómo correr todo desde cero, tests, estructura y decisiones técnicas.
- **`docker-compose.yml`** con `db` y `api`, y `web` opcional (`--profile web`). Puertos y credenciales salen de `.env`; MySQL por defecto en `127.0.0.1:3307`. Se probó con un proyecto aparte y puertos 3399/3099: en una base vacía las migraciones crearon todo y `/health` respondió `ok`. Ese proyecto y su volumen se eliminaron; no se tocó `antua-mysql` ni MariaDB.
- **`GET /health`** (`src/health/health.controller.ts`): consulta la base y responde 503 si no hay conexión.
- **Seed reproducible** (`scripts/seed.ts`, `scripts/seed-data.json`): productos, tags, cupones, usuarios y reseñas. Se puede repetir: busca por slug, sku, código o email. La contraseña es solo de desarrollo y se cambia con `SEED_PASSWORD`. Probado dos veces con los mismos conteos, en una base temporal.
- **Limpieza** (`scripts/seed-cleanup.ts`): solo datos `seed-`/`SEED`/`seed.`, y pide `--yes` porque también borra los pedidos que los incluyan. Se probó en la base temporal; **no se corrió sobre `antua_db`**.
- **`.gitignore`:** se agregan `*.sql`, variantes de `.env` y artefactos de playwright-cli. `git ls-files` confirma que no hay `.env`, `node_modules`, builds ni respaldos versionados (solo los `.env.example`).

**Falló y se corrigió**
- `upsert` de TypeORM con claves de relación dejaba colgado el seed: se reemplazó por buscar y guardar.
- Los scripts no terminaban si fallaban, porque la conexión quedaba abierta: ahora se cierra siempre.
- `@nestjs/schedule` 12 es solo ESM y Jest no lo carga: el vencimiento usa un `setInterval` con limpieza al apagar.

**Qué falta redactar:** ver "Qué falta" en [`estado-frontend.md`](./estado-frontend.md).

## Check final de las Fases 9 a 11 (15/11/2026)

1. **Front:** typecheck, lint y build sin errores ni warnings nuevos; 25 unit tests y el e2e de Playwright (desktop y mobile). **Back:** build, lint, 45 unit tests y 63 e2e contra `antua_test`.
2. **Recorrido con playwright-cli** en 375 y 1280 px, claro y oscuro, con la API en modo de pagos simulados. Todo OK en las 4 combinaciones, sin scroll horizontal ni errores en la consola. Capturas en `docs/checks/f11-*.png`. El recorrido:
   - Tienda resuelta en el backend y plazo de envío en el drawer y en el checkout.
   - Precio cambiado (409, aviso y reconfirmación).
   - Pago rechazado, reintento y aprobado por webhook firmado.
   - Registro desde el retorno de pago, que reclama el pedido.
   - Detalle con "Pagado" y el plazo de envío.
   - Perfil con validación.
   - Reseña publicada, editada y borrada.
   - Cupón retirado con aviso.
   - Recuperación de contraseña e inicio de sesión con la nueva.
3. **/web-interface-guidelines** sobre lo nuevo y modificado: 2 hallazgos menores, corregidos (`spellCheck` en el email del perfil y `translate="no"` en "Mercado Pago").
4. **DESIGN.md:** sin hex sueltos fuera del 3D, sin colores fuera de la paleta, sin `transition: all` ni tuteo. El único `outline-none` tiene reemplazo.
5. **Seguridad:** ownership con test en cada endpoint nuevo, DTOs validados, ningún secreto en el repo y logs solo con ids.
6. **Entorno:** se borró la base temporal `antua_migr_tmp`, que se usó para generar migraciones; `antua_test` queda para los e2e. A pedido del usuario se detuvieron los contenedores `competika-*` (no se borraron).

## 15/11/2026: Fase 12, panel de administración (`docs/prompt-fase-12-admin.md`)

### Paso 0: estado base

- Rama `feat/fase-12-admin`, creada desde `feat/fases-9-11` (todavía no se mezcló en `main`). Base (3307), API (3000, en modo de pagos simulados) y front (5173) respondiendo.
- **Front:** typecheck, lint y build sin errores; 25 unit tests OK.
- **Back:** build, lint y 45 unit tests OK. Los e2e fallaban de forma intermitente (1 a 7 de 63) por *timeout* de 5 s en `resetDatabase`: hacía `TRUNCATE` de las ~20 tablas antes de cada test, y en MySQL cada `TRUNCATE` recrea la tabla. 
  - **Qué cambió** (`test/helpers.ts`, `resetDatabase`): ahora solo vacía las tablas que tienen filas (`SELECT 1 … LIMIT 1` antes de cada `TRUNCATE`). En `test/jest-e2e.json` el timeout pasa a 30 s.
  - **Resultado:** 63/63, y la corrida bajó de 289 s a 91 s.

### 12.1: base de seguridad del panel (backend)

**Respaldo:** `~/respaldos/antua_db_20261115_2256.sql`, fuera del repo, antes de tocar el esquema.

**Migración `src/database/migrations/1794794256346-AdminPanel.ts`.** Solo agrega; no borra columnas ni tablas.
- `users.role`: enum `customer`/`admin`, con `customer` por defecto, así que todas las cuentas existentes quedaron como `customer`.
- Tabla `admin_audit_log`: quién, qué acción, sobre qué entidad, cuándo y un resumen JSON del cambio.
- Tabla `order_status_history`, para la 12.4.
- Columnas nuevas, para la 12.2, la 12.4 y la 12.6:
  - `orders.internal_note`
  - `reviews.is_hidden`
  - `tags.is_active`
  - `product_images.is_primary` y `product_images.file_name`
  - `products.nutrition_info`
- Se amplían `products.ingredients` (100 → 500) y `allergens` (100 → 255) con `MODIFY`, que conserva los datos.

**Incidente y cómo se resolvió.**
- `migration:generate` escribe un `DROP COLUMN` + `ADD COLUMN` cuando cambia el largo de un `varchar`. La API de desarrollo corre con `--watch` y `migrationsRun: true`: compiló y aplicó esa versión sobre `antua_db` en segundos, antes de que la corrigiera. Eso vació `ingredients` y `allergens` de los 13 productos.
- Se restauraron desde el respaldo de minutos antes: se cargó en una base temporal, se copiaron las dos columnas por `id`, se comprobó que no quedara ninguna diferencia y se borró la temporal.
- La migración del repo usa `MODIFY`, y se probó `run` → `revert` → `run` en una base temporal. `migration:generate` contra esa base confirma que el esquema coincide con las entidades.
- **Regla nueva en `CLAUDE.md`:** generar las migraciones fuera de `src` (o con la API detenida) y revisarlas antes de moverlas.

**Cómo funciona la autorización** (`src/admin/`).
- `admin-access.guard.ts` es un guard **global** (`APP_GUARD` en `src/app.module.ts`). En Nest, un guard decide si una request llega al controller, y uno global corre en todas las rutas.
  - Si la ruta empieza con `/admin` o tiene `@Roles(...)`, exige un JWT válido; si no lo hay, responde 401.
  - Después exige que el rol del usuario esté entre los permitidos; si no, 403.
  - Si una ruta `/admin` no tiene `@Roles`, responde **403 a todos**, incluso a un admin. Esto es "denegar por defecto": olvidarse del decorador no abre nada.
- **El rol sale de la base:** el JWT solo lleva el id del usuario (`sub`), y `JwtStrategy` busca al usuario en cada request. Si se le quita el rol, su token deja de servir en el acto (hay un test que lo prueba). Editar el JWT para "declararse admin" no sirve: el rol no está en el token, y la firma lo invalidaría.
- `roles.decorator.ts`: `@AdminController('products')` equivale a `@Controller('admin/products')` más `@Roles('admin')`. Todos los controllers del panel lo usan.
- **Nadie se vuelve admin desde la web.** `RegisterDto` y `UpdateProfileDto` no tienen `role`, y `ValidationPipe({ whitelist: true })` descarta todo campo que no esté en el DTO. Hay un test que manda `role: 'admin'` al registro y al perfil.
- **Auditoría** (`audit.service.ts`): `record()` acepta el `EntityManager` de la transacción, así que el cambio y su registro quedan juntos o no queda ninguno. `sanitizeChanges` descarta cualquier clave que contenga `password`, `token`, `hash`, `secret` o `card`.
- **Límite de intentos en el login:** los admins entran por el mismo `POST /auth/login`, que tiene `@Throttle` de 10 por minuto por IP (`src/auth/auth.controller.ts`). No hay un login aparte que se salte el límite.

**Script `pnpm admin:create`** (`scripts/admin-create.ts`).
- Pide el email, el nombre y la contraseña por terminal (la contraseña no se muestra), o los toma de `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`.
- Valida con las mismas reglas que el registro (`RegisterDto`, que incluye la política de contraseñas).
- Si el email ya existe, no hace nada, salvo con `--promote`.
- Sin terminal y sin variables, falla con un mensaje en vez de colgarse.

**Tests** (`test/admin-auth.e2e-spec.ts`). Recorre **todas** las rutas registradas en Express que empiezan con `/admin` y comprueba:
- sin token → 401;
- con un token inválido → 401;
- como `customer` → 403;
- como admin → nunca 401 ni 403.

Además:
- Si se agrega un endpoint `/admin` sin rol, el test falla.
- Un controller de prueba sin `@Roles` demuestra la denegación por defecto.

```bash
# Crear el primer admin (pide los datos):
pnpm --filter antua-api admin:create
# Sin terminal (por ejemplo en un servidor):
ADMIN_EMAIL=admin@ejemplo.com ADMIN_NAME="Nombre" ADMIN_PASSWORD='…' pnpm --filter antua-api admin:create

# Sin token → 401; con token de customer → 403; con token de admin → 200
curl -i localhost:3000/admin/audit
curl -i -H "Authorization: Bearer $JWT_CLIENTE" localhost:3000/admin/audit
curl -s -H "Authorization: Bearer $JWT_ADMIN" 'localhost:3000/admin/audit?entity=product&page=1'
```

### 12.2: catálogo en el panel (backend)

**Qué faltaba.**
- Las escrituras del catálogo eran `POST/PATCH/DELETE /products` y `/tags` con una clave compartida (`X-Admin-Key`).
- No había variantes, stock con motivo, imágenes ni reglas de borrado.

**Qué cambió.**
- **`ADMIN_API_KEY` se retiró.** No tenía otro uso. Se borraron:
  - `src/common/admin-key.guard.ts`;
  - las escrituras de `src/products/products.controller.ts` y `src/tags/tags.controller.ts`, que ahora son solo lectura;
  - sus DTOs viejos;
  - la variable de `.env.example` y de los tests.

  `test/security.e2e-spec.ts` comprueba que esas rutas responden 404 y que mandar `X-Admin-Key` a `/admin` da 401. Si tu `.env` todavía tiene `ADMIN_API_KEY`, ya no se usa: podés borrarla.
- **`src/admin/catalog/admin-products.service.ts`**, el servicio del catálogo para el panel. Cada escritura corre en una transacción y escribe su auditoría en esa misma transacción.
  - **Listado** con búsqueda por nombre, slug o SKU; filtros activo/inactivo, tag y stock bajo; orden; y paginación con tope de 50. El `LIKE` escapa `%` y `_`.
  - **Slug:** si no se manda, se genera desde el nombre (`slug.ts`: sin tildes ni eñes). Si choca, se agrega `-2`, `-3`… Si se manda uno a mano que ya existe, responde 409.
  - **`base_price`** se recalcula como el menor precio de las variantes activas (`syncBasePrice`). El panel nunca lo pide.
  - **Activación:** un producto nuevo arranca inactivo y solo se puede activar con al menos una variante activa (409). Si se desactiva su última variante, el producto se desactiva solo.
- **Variantes** (`dto/admin-product.dto.ts`):
  - El nombre es `x1`, `x6` o `x12`, una de cada una por producto.
  - El precio es positivo, con 2 decimales como máximo (`IsNumber({ maxDecimalPlaces: 2 })`), igual que la columna `decimal(10,2)`.
  - El SKU es único (409 si se repite).
  - El stock **no** se edita por `PATCH`: el DTO no tiene ese campo, y `whitelist` lo descarta.
- **Stock con motivo:** `POST /admin/products/:id/variants/:variantId/stock` con `reason` (`restock`, `shrinkage` o `adjustment`) y `quantity`.
  - La cuenta la hace la función pura `nextStock`, con unit test. Una merma no puede dejar el stock negativo (409).
  - La fila de la variante se bloquea (`pessimistic_write`) para no pisar un pedido que entra al mismo tiempo.
  - La auditoría guarda el antes, el después y el motivo.
- **Borrado:** si el producto o la variante aparece en `order_items` o en `cart_items` (o tiene reseñas), **no se borra: se desactiva**. La respuesta lo explica: `{ deleted: false, deactivated: true, message: "Tiene pedidos o carritos asociados…" }`. Solo se borra físicamente lo que no tiene historial, y en ese caso también se borran sus archivos de imagen.
- **Imágenes** (`image-file.ts`):
  - `FileInterceptor` de multer las recibe **en memoria**, con un límite de 2 MB (413 si se pasa) y un solo archivo.
  - `detectImageKind` mira los primeros bytes (la "firma" de JPEG, PNG y WebP). La extensión y el `Content-Type` los manda el navegador y se pueden falsificar: un HTML renombrado a `.png` se rechaza con 400.
  - El nombre lo genera el servidor: 32 caracteres hex aleatorios más la extensión del tipo real. Se escribe con `flag: 'wx'`, que nunca pisa un archivo existente.
  - Hasta 10 imágenes por producto. La primera queda como principal, y hay endpoints para cambiar el orden y la principal.
  - Al borrar una imagen se borra su archivo, pero solo si el nombre tiene el formato generado; nunca una ruta armada con datos de afuera.
- **Archivos estáticos** (`src/app.setup.ts`): `/uploads` sirve `UPLOADS_DIR` con `express.static`, con estas opciones y cabeceras:
  - sin listado de carpeta ni archivos ocultos;
  - `nosniff`;
  - `Content-Security-Policy: default-src 'none'; sandbox`: aunque se colara un HTML, no ejecutaría nada;
  - `Cross-Origin-Resource-Policy: cross-origin`, para que el front pueda mostrarlas desde otro origen.

  Un test comprueba que `/uploads/../package.json` no sale.
- **Configuración** (`src/config/env.validation.ts`):
  - `UPLOADS_DIR`: por defecto `uploads/` y nunca dentro de `src/`.
  - `LOW_STOCK_THRESHOLD`: por defecto 5.

  Las dos tienen tests en `env.validation.spec.ts`.
- **Docker:** `docker-compose.yml` monta el volumen `uploads_data` en `/data/uploads`, así las imágenes sobreviven a reinicios y rebuilds. `uploads/` está en `.gitignore` y `.dockerignore`.
- **Tags** (`admin-tags.service.ts`):
  - Se pueden crear, renombrar y activar o desactivar. No hay `DELETE`.
  - Los slugs que usa la Home (`clasicas`, `sin-gluten`, `veganas`, `sin-azucar`, `packs`) no cambian (409).
  - El público solo ve los tags activos: `GET /tags`, las facetas y el filtro de la Tienda.
- **Público** (`src/products/products.service.ts`, `toPublicProduct`): saca los tags inactivos y las reseñas ocultas, y pone la imagen principal primero. Se reformateó con Prettier: tenía un `eslint-disable prettier` y otra indentación.

```bash
A="Authorization: Bearer $JWT_ADMIN"
curl -s -H "$A" 'localhost:3000/admin/products?q=chips&status=active&lowStock=true&page=1'
curl -s -H "$A" -H 'Content-Type: application/json' -X POST localhost:3000/admin/products \
  -d '{"name":"Galleta de maní","description":"…","ingredients":"Harina, maní","allergens":"Maní","tagIds":[1]}'
curl -s -H "$A" -H 'Content-Type: application/json' -X POST localhost:3000/admin/products/14/variants \
  -d '{"name":"x6","price":5400,"stock":12,"sku":"MANI-X6"}'
curl -s -H "$A" -H 'Content-Type: application/json' -X POST localhost:3000/admin/products/14/variants/40/stock \
  -d '{"reason":"shrinkage","quantity":2,"note":"Se rompieron"}'
curl -s -H "$A" -F file=@foto.webp localhost:3000/admin/products/14/images
curl -s -H "$A" -X DELETE localhost:3000/admin/products/14   # → {"deleted":false,"deactivated":true,"message":"…"} si tiene historial
curl -s -H "$A" -H 'Content-Type: application/json' -X PATCH localhost:3000/admin/tags/1 -d '{"slug":"otra"}'  # → 409 si es de la Home
```

### 12.3: cupones (backend)

**Qué faltaba:** los cupones solo se podían crear tocando la base. Las reglas que valen al aplicarlos (`src/cart/cart.service.ts`, `applyCoupon`, y `src/orders/orders.service.ts`) son estas, y no cambiaron:
- tipo `percentage` o `fixed`;
- mínimo opcional;
- límite de usos (`usage_limit`, con `null` = sin límite);
- vigencia entre `valid_from` y `valid_until`;
- `is_active`.

**Qué cambió** (`src/admin/coupons/`):
- **El código se normaliza** a mayúsculas y sin espacios antes de validarlo (`normalizeCouponCode`): " verano 20 " → `VERANO20`. Es único (409 si se repite).
- **Coherencia entre campos.** La valida `couponRuleErrors`, una función pura con unit test:
  - el porcentaje va de 1 a 100;
  - la fecha de fin es posterior a la de inicio;
  - mínimo y límite son no negativos;
  - las fechas no pasan de 2037.

  El tope de 2037 se descubrió en el e2e: las columnas son `TIMESTAMP` de MySQL, que no acepta fechas después de enero de 2038, y una fecha de 2099 terminaba en un error 500. Ahora es un 400 que dice qué corregir.
- **Al editar,** las reglas se validan con los valores combinados (lo nuevo más lo que ya tenía).
- **`times_used` no se puede mandar:** no está en el DTO, y `whitelist` lo descarta.
- **Estado** (`couponStatus`): `active`, `inactive`, `scheduled` (todavía no empezó), `expired` o `exhausted` (se agotaron los usos). Se puede filtrar por estado en SQL.
- **Borrado:** un cupón usado (`times_used > 0`, con pedidos o aplicado en un carrito) se desactiva en vez de borrarse, con el mismo formato de respuesta que en el catálogo.
- `Coupon.min_order_amount` pasa a tiparse `number | null`, como ya era en la base (no cambia el esquema).

```bash
curl -s -H "$A" 'localhost:3000/admin/coupons?status=active&q=VER'
curl -s -H "$A" -H 'Content-Type: application/json' -X POST localhost:3000/admin/coupons \
  -d '{"code":"verano 20","discount_type":"percentage","discount_value":20,"min_order_amount":3000,"usage_limit":100,"valid_from":"2026-12-01T03:00:00.000Z","valid_until":"2027-03-01T03:00:00.000Z"}'
curl -s -H "$A" -X DELETE localhost:3000/admin/coupons/3   # usado → {"deleted":false,"deactivated":true,…}
```

### 12.4: pedidos (backend)

**Qué faltaba:** nada cambiaba `orders.status`, y para cancelar había que tocar la base a mano.

**Estados existentes, sin cambios** (`src/orders/entities/order.entity.ts`): `pending`, `preparing`, `shipped`, `delivered` y `canceled`. "Pagado" no es un estado logístico: está en `payment_status` (lo maneja Payments), y el panel **solo lo lee**.

**Máquina de estados** (`src/orders/order-status.ts`, función pura con unit test):

```
pending ──► preparing ──► shipped ──► delivered
   │            │
   └──► canceled ◄┘
```

- `pending → preparing` solo si el pago está aprobado (`payment_status = paid`). La excepción es un pedido **sin pago en línea** (`payment_expires_at = null`: se hizo con los pagos deshabilitados y el cobro se coordina aparte).
- Se cancela desde `pending` o `preparing`; desde `shipped` o `delivered`, no.
- Toda transición inválida responde **409** con `code: "INVALID_TRANSITION"` y un mensaje en castellano, por ejemplo "Un pedido enviado solo puede pasar a: entregado.".

**Cancelar reutiliza la lógica del vencimiento.**
- La devolución de stock y cupón vivía dentro de `src/payments/payment-expiration.service.ts`. Se movió **tal cual** a `src/orders/order-reservation.ts` (`releaseOrderReservation`), y el vencimiento ahora llama a esa función.
- Es el **único cambio en Payments**: una extracción sin cambio de comportamiento, para no duplicar la lógica, como pedía el prompt. Los e2e de pagos (incluido "vencimiento: devuelve stock y cupón") siguen pasando.
- **Si el pago estaba pendiente o rechazado,** `payment_status` pasa a `canceled`, igual que al vencer. Si después llega un pago aprobado, Payments lo marca `paid_after_cancel`.
- **Si ya estaba pagado,** el pago no se toca: la respuesta trae un `notice` que pide devolverlo desde Mercado Pago.
- La fila del pedido se bloquea (`pessimistic_write`), así un webhook o el vencimiento no lo pisan al mismo tiempo. Cancelar dos veces da 409 y no devuelve el stock dos veces (hay test).

**Panel** (`src/admin/orders/`).
- **Listado** con filtros por estado, estado de pago, número o email, y rango de fechas.
  - Las fechas son días de calendario de **America/Montevideo** (`src/common/store-time.ts`): `?from=2026-11-14&to=2026-11-14` va de las 03:00 UTC del 14 a las 03:00 UTC del 15. Un test lo verifica con un pedido de las 23:30 de Montevideo.
  - Las unidades de cada pedido salen de una sola consulta agrupada por página.
- **Detalle:**
  - ítems con el precio del *snapshot*;
  - dirección, contacto (email de la cuenta o del invitado), cupón y totales;
  - intentos de pago (solo lectura, sin datos del pagador);
  - nota interna e historial (`order_status_history`, con quién y cuándo);
  - las transiciones posibles en ese momento.
- **El panel nunca edita precios ni totales:** no hay endpoint para eso, y la whitelist descarta un `total` que venga en el cuerpo (hay test).
- **La nota interna** (`orders.internal_note`) tiene `select: false` y `@Exclude`: no sale en las rutas del cliente (hay test). La auditoría guarda solo el largo de la nota, no su texto.

```bash
curl -s -H "$A" 'localhost:3000/admin/orders?status=pending&payment_status=paid&from=2026-11-01&to=2026-11-15&q=gmail'
curl -s -H "$A" localhost:3000/admin/orders/42
curl -s -H "$A" -H 'Content-Type: application/json' -X PATCH localhost:3000/admin/orders/42/status -d '{"status":"preparing"}'
# → 409 {"code":"INVALID_TRANSITION","message":"El pago todavía no está aprobado: no se puede preparar el pedido."}
curl -s -H "$A" -H 'Content-Type: application/json' -X PATCH localhost:3000/admin/orders/42/note -d '{"note":"Llamar antes de ir"}'
```

### 12.5 y 12.6: resumen, moderación de reseñas y usuarios (backend)

**`GET /admin/stats`** (`src/admin/stats/admin-stats.service.ts`). Todo se calcula con `SUM`, `COUNT` y `GROUP BY` en MySQL: nunca se traen los pedidos a Node.
- **Ventas y cantidad de pedidos** de hoy, de los últimos 7 días y de los últimos 30, en una sola consulta con sumas condicionales. "Ventas" = pedidos no cancelados.
- **Colas:**
  - pendientes de pago: en línea, sin pagar ni vencer;
  - para preparar: pagados, o sin pago en línea;
  - en preparación.
- **Serie diaria de 30 días** para el gráfico, agrupada con `CONVERT_TZ(created_at, '+00:00', '-03:00')`. `fillDailySeries` (unit test) completa con ceros los días sin pedidos.
- **Más vendidos** (top 5 en 30 días), **variantes con stock bajo** (umbral `LOW_STOCK_THRESHOLD`) y **reseñas nuevas** (cantidad en 7 días y las 5 últimas).
- **Zona horaria:** "hoy" empieza a la medianoche de America/Montevideo (`src/common/store-time.ts`, con unit tests). La base sigue en UTC, como quedó después de la corrección de la Fase 9. El desfase se calcula con `Intl`, así que el código no supone −3 a mano. Se usa el desfase y no el nombre de zona porque MySQL necesita tablas de zonas horarias cargadas para entender `America/Montevideo`.

**Reseñas** (`src/admin/moderation/`):
- `GET /admin/reviews` con búsqueda (producto o comentario), estrellas y visibles u ocultas.
- `PATCH /admin/reviews/:id { is_hidden }`: **ocultar es reversible**, y es lo recomendado. Una reseña oculta no sale en `GET /products/:slug/reviews` ni en `GET /products/:slug`.
- El promedio de estrellas lo calcula el front con las reseñas que recibe, así que **se recalcula solo**.
- `DELETE` borra para siempre.
- Las tres acciones quedan en la auditoría.

**Arreglo:** el e2e mostró que `findOne` de `src/products/products.service.ts` todavía devolvía las reseñas ocultas en el detalle. Ahora también pasa por `toPublicProduct`.

**Usuarios:** `GET /admin/users`, en **solo lectura**: nombre, email, fecha de alta, rol y cantidad de pedidos.
- La consulta elige las columnas una por una: aunque mañana la entidad tenga otra columna sensible, no sale. Un test verifica que la respuesta tiene exactamente esas claves y que no contiene `password`, `hash` ni `token`.
- No hay `PATCH` ni `DELETE`: el panel no cambia roles ni contraseñas.

```bash
curl -s -H "$A" localhost:3000/admin/stats
curl -s -H "$A" 'localhost:3000/admin/reviews?hidden=false&rating=1'
curl -s -H "$A" -H 'Content-Type: application/json' -X PATCH localhost:3000/admin/reviews/7 -d '{"is_hidden":true}'
curl -s -H "$A" 'localhost:3000/admin/users?q=gmail&role=customer'
```

### Moneda: UYU en toda la app

**Qué pasaba:** los pagos se cobraban en `UYU` (`PAYMENT_CURRENCY` en antua-api, por defecto `UYU`), pero el front mostraba los precios con `es-AR`/`ARS`, y el contacto decía Buenos Aires.

**Qué cambió:**
- `src/lib/format.ts` es el **único** lugar con `Intl`: `LOCALE = 'es-UY'` y `CURRENCY = 'UYU'`. Lo usa toda la app, panel incluido.
- Funciones nuevas en ese archivo: `formatExactPrice`, para precios con centavos en el panel; `formatNumber`; `formatDateTime`, en hora de Montevideo; y `formatShortDay`, para el gráfico.
- La ubicación provisoria del footer y de Contacto pasa a "Montevideo, Uruguay". El email sigue siendo provisorio.
- La regla quedó en `CLAUDE.md`.

**Confirmado:** el backend guarda los montos sin moneda (`decimal`), y el único lugar donde la declara es Payments (`UYU`), que coincide.

### 12.2 a 12.7: panel en el front (`/admin`)

**Estructura.**
- **Un solo chunk:**
  - `src/pages/admin/index.ts` reexporta todas las páginas del panel, y `App.tsx` las carga con `lazy(() => import('./pages/admin'))`. Vite arma un único chunk `admin-*.js` (96,8 kB, 25 kB gzip) que la tienda nunca descarga.
  - El `index` principal creció 2,8 kB: las rutas, el link del menú y `imageUrl`.
  - Three.js no se importa en el panel.
- **`AdminLayout`:**
  - Barra lateral con 8 secciones, encabezado con el usuario, "Ver la tienda", tema y "Cerrar sesión", y skip link.
  - `meta robots noindex`, y `public/robots.txt` excluye `/admin`.
- **Acceso.** La seguridad real la hace el backend; esto es solo comodidad.
  - Sin sesión, abre el AuthModal y queda en la misma URL.
  - Con una cuenta `customer`, muestra "No tenés permiso".
  - Si la sesión se guardó antes de que existieran los roles, espera a `/auth/me`.
  - El link "Administración" del menú de cuenta solo aparece para admins.
  - `User` ahora tiene `role`.
- **Componentes** (`src/components/admin/`):
  - `DataTable`: con `caption`, `th scope`, `aria-sort`, orden con links reales y una región con nombre y scroll horizontal, así a 375 px no rompe la página.
  - `StatusBadge` (ícono + texto) y `Toaster` (avisos con `aria-live`; los errores como `role="alert"`).
  - Campos (`TextAreaField`, `SelectField` con colores explícitos y `CheckboxField` con una sola zona de clic) y `SearchField` con debounce.
  - `useAdminQuery`: filtros, orden y página en la URL.
  - `useUnsavedChanges` + `UnsavedChangesDialog`: `useBlocker` y `beforeunload`, con `allowNextNavigation()` para la navegación que sigue a un guardado.
  - Se reutilizan `Button`, `ConfirmDialog`, `Dialog`, `FormField`, `EmptyState`, `ErrorState` y la `Pagination` de la Tienda.
- **Páginas:**
  - **Resumen:** tarjetas y gráfico SVG propio (`SalesChart`, sin librerías), con título y descripción accesibles, `<title>` por barra y una tabla alternativa.
  - **Productos:** lista con filtros y orden en la URL, y un editor por secciones: datos y tags, variantes y stock (diálogos para editar y mover stock con motivo), imágenes (vista previa, principal, orden y borrado) y borrado o desactivación.
  - **Tags.**
  - **Cupones:** lista y formulario. Las fechas son días de calendario de Montevideo.
  - **Pedidos:** lista con filtros y detalle con acciones de estado (con confirmación), nota interna e historial.
  - **Reseñas:** ocultar o mostrar, y borrar con confirmación.
  - **Usuarios:** solo lectura.
  - **Auditoría.**
- **Validación en línea** (`src/lib/adminForms.ts`, con unit tests): las mismas reglas que los DTOs. Al guardar, el foco va al primer error. Toda acción destructiva pide confirmación, y su resultado se anuncia con un toast.
- **Imágenes subidas:** la API devuelve `/uploads/…` y el front lo resuelve contra la URL de la API (`imageUrl` en `api/client.ts`). En desarrollo pasa por el proxy `/api`.

## Check final de la Fase 12 (16/11/2026)

1. **Front:** typecheck, lint y build sin errores ni warnings nuevos; 32 unit tests; e2e de Playwright (compra de invitado y panel, desktop y mobile) 5/5. **Back:** build, lint, 67 unit tests y 95 e2e contra `antua_test`.
2. **Chunk del panel:** `admin-*.js` pesa 97,1 kB (25 kB gzip). Con playwright-cli se comprobó que **no se descarga** en la Home, la Tienda, la Ficha ni el Checkout, solo al entrar a `/admin`. `index.html` no lo precarga.
3. **Recorrido con playwright-cli** como admin, en 1280 y 768 px, claro y oscuro: las 13 pantallas cargan sin scroll horizontal y sin errores en la consola, y la validación lleva el foco al primer error. A 375 px: Resumen, Productos, Producto, Cupón, Pedidos, Pedido y Reseñas. **Sin sesión**, el AuthModal se abre. **Como cliente** aparece "No tenés permiso", y la API responde 403. Capturas en `docs/checks/f12-*.png` (no se versionan).
4. **Corregido durante el check:**
   - **A 375 px, la lista de productos ensanchaba la página.** Los textos `sr-only` de los encabezados ordenables (`position: absolute`) escapaban de la región con scroll, que no estaba posicionada. Se resolvió con `relative` en `DataTable`.
   - **`pnpm seed` borraba todas las imágenes de los productos seed,** incluidas las subidas desde el panel, y dejaba sus archivos huérfanos. Además, recreaba las suyas sin imagen principal. Ahora reemplaza solo las propias (sin `file_name`) y marca como principal la de menor orden si no hay otra.
5. **Guidelines.** El skill `/web-interface-guidelines` no estaba disponible en esta sesión: se aplicaron sus reglas a mano sobre los 41 archivos nuevos o modificados de `src/`. Hallazgos corregidos:
   - las regiones `aria-live` del `Toaster` usaban `display: contents`, que algunos lectores sacan del árbol de accesibilidad;
   - las estrellas usaban `aria-label` en un `<span>` sin rol; ahora tienen un texto `sr-only`;
   - el encabezado fijo podía tapar el elemento enfocado; ahora hay `scroll-padding-top` mientras el panel está montado;
   - `autoCapitalize` en el código de cupón;
   - el título del diálogo de pedidos se armaba con un `.replace`;
   - el placeholder de imagen se veía negro en oscuro.
6. **DESIGN.md:** sin hex sueltos, sin colores fuera de la paleta, sin `transition: all`, sin `outline-none` y sin radios fuera de la escala. Voseo en todos los textos.
7. **Seguridad:**
   - todos los controllers de `src/admin` usan `@AdminController`, y la matriz e2e lo verifica en cada ruta;
   - todo `@Body` y `@Query` es un DTO de clase con whitelist, y los servicios copian campo por campo (el único *spread* hacia la base es un `CreateVariantDto` ya validado);
   - el SQL crudo usa parámetros, y los `LIKE` escapan sus comodines;
   - el módulo no escribe logs;
   - ninguna respuesta incluye hashes ni tokens;
   - las subidas se validan por contenido, tamaño y nombre generado.
8. **`git ls-files`:** no hay `.env`, `node_modules`, respaldos, builds ni subidas versionados.
9. **Entorno:** después de un reinicio de la máquina, se volvieron a levantar solo la API (pagos simulados) y el front de este repo. No se tocó ningún otro servicio ni contenedor. La base temporal `antua_migr_tmp` se borró.

## 16/11/2026: Fase 13, contenido real y control de calidad (`docs/prompt-fase-13-contenido-qa.md`)

### Paso 0: estado base

- Rama `feat/fase-13-contenido-qa`, creada desde `origin/main` (que ya incluye la Fase 12, PR #2). Base (3307), API (3000, en modo de pagos simulados) y front (5173) respondiendo.
- **Front:** typecheck, lint y build sin errores; 32 unit tests y 5 e2e de Playwright OK.
- **Back:** build, lint, 67 unit tests y 95 e2e OK.
- **`/web-interface-guidelines`:** el archivo `antua-web/.claude/commands/web-interface-guidelines.md` existe, pero el comando **no está disponible en esta sesión**. Claude Code se abrió en `antua-api` y solo carga los comandos de esa carpeta. Para usarlo, hay que abrir la sesión en `antua-web` (o en la raíz, con el comando copiado a `.claude/commands/`).

### Las migraciones ya no se aplican solas

**Qué pasaba:**
- `src/app.module.ts` tenía `migrationsRun: true`: al arrancar, la API aplicaba todas las migraciones pendientes.
- Con `pnpm dev` en modo watch, una migración recién generada se aplicaba en segundos.
- `migration:generate` a veces escribe `DROP COLUMN` + `ADD COLUMN` (por ejemplo, al ampliar un `varchar`).
- Así, en la Fase 12, se vaciaron los ingredientes y alérgenos antes de que nadie pudiera leer la migración.

**Qué cambió:**
- **`src/app.module.ts`:** `migrationsRun: false`. Las migraciones se aplican a mano, con `pnpm migration:run`, después de leerlas.
- **`src/main.ts`:** al arrancar, si falta alguna migración, la API lo **avisa en el log**, pero no la aplica.
- **`scripts/seed.ts`:** antes también llamaba a `runMigrations()` por su cuenta. Ahora se niega a correr si hay pendientes.
- **`test/helpers.ts`:** los e2e migran explícitamente, y solo si la base es `antua_test`.
- **`package.json`:** `migration:run:dist` aplica las migraciones con el código compilado, para Docker (`docker compose run --rm api pnpm migration:run:dist`).
- **Documentación:** README de la raíz y de la API, `Dockerfile` y `CLAUDE.md`.

**En simple:** antes, la API era como un empleado que firmaba cualquier papel que le dejaran en el escritorio apenas entraba. Ahora te avisa que hay un papel para firmar, y lo firmás vos después de leerlo.

### 13.1: contenido de las páginas

**Integrado** desde `docs/contenido-sitio.md`: Nosotros, Preguntas frecuentes, Contacto, Términos y Privacidad, con el `<h1>`, el `document.title` y la meta description del archivo. Se sacó la marca de "Texto provisorio" de las cinco, porque las cinco quedaron integradas.
- **`ContentPage`:** ya no muestra el aviso provisorio. Acepta un aviso, una bajada y una nota al pie.
- **`LegalPage` (nuevo), para Términos y Privacidad:**
  - aviso **"Borrador de práctica"** siempre visible;
  - índice "Contenido" con anclas a cada `h2` (que tiene `scroll-margin-top`);
  - fecha de última actualización en `<time>`: 16/11/2026, la fecha real de integración (`LEGAL_UPDATED_AT` en `src/data/site.ts`).
- **Preguntas frecuentes:** acordeón nativo con `<details>`/`<summary>`. Funciona con teclado y el navegador anuncia si está abierto o cerrado. Los temas son `h2`.
- **Contacto:** solo datos, sin formulario (no hay endpoint).
- **Email:** `contacto@antojarte.example` en Contacto, footer, Privacidad, Términos, Preguntas y en la pantalla de error. Se quitó `hola@antua.com.ar`.
- **Footer:** suma la nota "Antojarte es una marca ficticia creada para un proyecto de práctica.".
- **Navbar:** en escritorio, un menú **"Ayuda"** (disclosure, como el de cuenta: Escape y clic afuera lo cierran y devuelven el foco) con las cinco páginas; antes había solo dos links. En mobile ya estaban las cinco en el menú.

**Lo que cambié del texto porque no coincidía con la app:**

| Página | Texto original | Qué hace la app | Cómo quedó |
|---|---|---|---|
| Nosotros | Categoría "De temporada" y "galletas… de temporada" | La tienda tiene 5 tags: Clásicas, Sin gluten, Veganas, Sin azúcar y Packs | Se quitó "De temporada" |
| Nosotros | "Packs de 1, 6 y 12 unidades" | Son variantes de cada galleta (1, caja de 6 y caja de 12) | "Cada galleta viene de a 1, en caja de 6 o en caja de 12" |
| Preguntas | Pagos: variante A o B | Sin credenciales de Mercado Pago (tu `.env`), los pagos están deshabilitados y el pedido se registra | **Variante B** (pago a coordinar) |
| Preguntas | "Te mandamos un enlace…" | El enlace se genera, pero `MailService` solo lo escribe en el log (no hay SMTP) | Se agregó "(En este proyecto de práctica el correo todavía no se envía de verdad.)" |
| Preguntas | Plazo de entrega | `SHIPPING_ETA_DAYS` no está en tu `.env`, así que hoy no se muestra | Coincide con el texto ("si todavía no lo ves, escribinos"): sin cambio |
| Privacidad | Contraseña "guardada de forma cifrada" | Se guarda un hash bcrypt (no se puede descifrar) | "Protegida con un algoritmo de hash" |
| Privacidad | Cuenta: nombre, correo y contraseña | También teléfono (opcional) y direcciones guardadas | Se agregaron |
| Privacidad | "Identificador de carrito y tu sesión en el almacenamiento local, y tu tema" | No hay cookies. `localStorage` guarda `antua.auth` (token, nombre, email, rol), `antua.guestToken` y el tema; `sessionStorage` guarda la referencia del último pedido (id y token de invitado) | Se detalló, aclarando que no hay cookies |
| Privacidad | Comparte con "el servicio de envío de correos" | No hay SMTP ni proveedor de pagos conectados | "Cuando estén activos… Hoy ninguno de los dos está conectado" |
| Términos | "La información nutricional puede ser orientativa" | Los valores cargados son inventados | "La información nutricional que se muestra hoy es de ejemplo" |

**Verificado y sin cambios:**
- envío con costo fijo visible antes de confirmar;
- aviso y reconfirmación si cambia el precio (409 `PRICE_CHANGED`);
- reglas de cupón (mínimo, vencimiento y límite);
- solo se reseña lo comprado **y entregado** (`reviews.service.ts`, `hasPurchased`);
- reseñas que se pueden ocultar (panel);
- límite de intentos en el login;
- precios en UYU;
- no se guardan datos de tarjeta.

**Pendiente de decidir:** el logo y el footer dicen "Antua", y los textos nuevos, "Antojarte". DESIGN.md los da como alias, pero el sitio debería usar uno solo.

**Información nutricional:**
- No hizo falta ninguna migración: `products.nutrition_info` ya existía (texto, Fase 12).
- **Formato de tabla:** una fila por línea, con las columnas separadas por `|`; la primera línea es el encabezado.
  - `src/lib/nutrition.ts` lo convierte en una tabla accesible en la Ficha (`caption`, `th scope`, región con scroll), siempre con la nota "Información nutricional de ejemplo (proyecto de práctica). No corresponde a un producto real.".
  - Si el texto no tiene ese formato, se muestra como párrafo.
  - Sin datos, dice "Todavía no cargamos…" en vez de "Pronto…".
  - El formulario del panel explica el formato.
- **Script `antua-api/scripts/nutrition-examples.ts` (`pnpm nutrition:examples`):**
  - completa **solo campos vacíos** (información nutricional y, si estuvieran vacíos, ingredientes y alérgenos) con los valores de §6;
  - la categoría sale de los tags, con esta prioridad: sin azúcar > sin gluten > veganas > clásicas; "de temporada" usa los valores de clásicas;
  - los productos que solo son "Packs" (la caja surtida) o que no tienen tags quedan sin tocar;
  - `--dry-run` muestra lo que haría, `--yes` aplica y `--undo --yes` deshace, pero solo lo que sigue igual a lo que cargó el script: si alguien lo editó después, se respeta;
  - cada cambio queda en `admin_audit_log` como `product.nutrition_example` (sin admin);
  - las funciones puras están en `src/products/nutrition-examples.ts`, con unit tests: valores por 100 g = valor por unidad × 2,5.
- **Aplicado en `antua_db`:**
  - respaldo previo en `~/respaldos/antua_db_20261116_1903_antes-nutricion.sql`;
  - se completaron 11 productos (solo `nutrition_info`: todos ya tenían ingredientes y alérgenos);
  - se probó deshacer (volvió a 0) y aplicar de nuevo.

**Hallazgo de calidad:** el e2e del panel dejaba **activos en la Tienda** sus productos de prueba (`seed-e2e-*`, sin tags).
- Se desactivaron los 13 que había, por `PATCH /admin/products/:id`: queda en la auditoría y se puede revertir.
- `e2e/admin.spec.ts` ahora desactiva su producto al terminar.
