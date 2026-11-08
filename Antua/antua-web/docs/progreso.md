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

## Fase 7: Reseñas y páginas que faltan

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
