# Panel de administración

El panel vive en el front, en `/admin/*`, y usa las rutas `/admin/*` de la API. Sirve para operar la tienda sin tocar la base: catálogo, cupones, pedidos, reseñas, usuarios (solo lectura), métricas y auditoría.

## Modelo de roles

- `users.role` es `customer` (por defecto) o `admin`.
- **Nadie se vuelve admin desde la web.** El registro y el perfil no aceptan `role` (la whitelist del `ValidationPipe` lo descarta), y el panel no gestiona roles.
- **El rol se lee de la base en cada request.** El JWT solo lleva el id del usuario. Quitarle el rol a alguien corta su acceso en el acto, aunque su token siga vigente.
- **`AdminAccessGuard`** (`antua-api/src/admin/admin-access.guard.ts`) es un guard **global**:
  - cualquier ruta que empiece con `/admin` exige un JWT válido (si no, **401**);
  - después exige un rol permitido por `@Roles` (si no, **403**);
  - una ruta `/admin` sin `@Roles` responde 403 a todos (**denegar por defecto**).
- Los controllers del panel usan `@AdminController('nombre')`, que equivale a `@Controller('admin/nombre')` más `@Roles('admin')`.
- **El login de los admins** es el mismo `POST /auth/login`, con el mismo límite de 10 intentos por minuto por IP.
- **No existe una clave compartida.** `ADMIN_API_KEY` se retiró en la Fase 12.
- **El front verifica el rol solo por comodidad:** esconde el panel y el link del menú. La seguridad real está en el backend.

## Crear el primer admin

Se crea en el servidor, por línea de comandos. La contraseña nunca va en el código ni en el repo.

```bash
# Interactivo: pide email, nombre y contraseña (la contraseña no se muestra al escribirla)
pnpm --filter antua-api admin:create

# Sin terminal (por ejemplo, un servidor o CI): por variables de entorno
ADMIN_EMAIL=admin@ejemplo.com ADMIN_NAME="Nombre Apellido" ADMIN_PASSWORD='…' pnpm --filter antua-api admin:create

# Darle el rol a una cuenta que ya existe
ADMIN_EMAIL=persona@ejemplo.com pnpm --filter antua-api admin:create --promote
```

- La contraseña sigue la misma política que el registro: de 8 a 72 caracteres, con al menos una letra y un número.
- **Con la base en Docker:** corrélo desde tu máquina. El script usa las variables `DB_*` de `antua-api/.env` y se conecta al puerto publicado (por defecto, el 3307).
- **Admin solo para desarrollo:** `SEED_ADMIN_PASSWORD='…' pnpm --filter antua-api seed` crea `seed.admin@antojarte.example`. No tiene contraseña por defecto, y `seed:clean --yes` lo borra.

**Para quitarle el rol a alguien** (no hay pantalla para eso, a propósito):

```sql
UPDATE users SET role = 'customer' WHERE email = 'persona@ejemplo.com';
```

## Estructura

| Front (`antua-web/src`) | API (`antua-api/src/admin`) |
|---|---|
| `pages/admin/`: una página por sección, reexportadas en `index.ts` (un solo chunk diferido) | `admin.module.ts`, `admin-access.guard.ts`, `roles.decorator.ts`, `audit.service.ts` |
| `components/admin/`: `DataTable`, `StatusBadge`, `Toaster`, campos, `SalesChart`, `product/*` | `catalog/` (productos, variantes, stock, imágenes y tags) |
| `api/admin.ts`, `types/admin.ts` | `coupons/`, `orders/`, `stats/`, `moderation/` (reseñas y usuarios) |
| `lib/adminForms.ts` (validación), `lib/adminLabels.ts` (textos) | `dto/page-query.dto.ts`: paginación con un tope de 50 |

### Rutas del front

| Ruta | Qué hace |
|---|---|
| `/admin` | Resumen: ventas de hoy, 7 y 30 días, colas, gráfico, más vendidos, stock bajo y reseñas nuevas |
| `/admin/productos` | Lista con búsqueda, filtros (estado, tag, stock bajo), orden y paginación en la URL |
| `/admin/productos/nuevo`, `/admin/productos/:id` | Datos y tags, variantes y stock, imágenes, y borrado o desactivación |
| `/admin/tags` | Crear, renombrar, activar y desactivar |
| `/admin/cupones`, `/admin/cupones/nuevo`, `/admin/cupones/:id` | Lista y formulario |
| `/admin/pedidos`, `/admin/pedidos/:id` | Filtros; detalle con cambio de estado, nota interna e historial |
| `/admin/resenas` | Ocultar o mostrar, y borrar |
| `/admin/usuarios` | Solo lectura |
| `/admin/auditoria` | Quién hizo qué y cuándo |

## Endpoints

Todos exigen `Authorization: Bearer <JWT de un admin>`. Sin token responden 401; con un token de cliente, 403.

| Recurso | Rutas |
|---|---|
| Resumen | `GET /admin/stats` |
| Productos | `GET /admin/products` (`q`, `status`, `tag`, `lowStock`, `sort`, `dir`, `page`, `limit`); `GET`, `PATCH` y `DELETE /admin/products/:id`; `POST /admin/products` |
| Variantes | `POST /admin/products/:id/variants`; `PATCH` y `DELETE /admin/products/:id/variants/:variantId`; `POST …/:variantId/stock` |
| Imágenes | `POST /admin/products/:id/images` (multipart `file`); `PATCH …/images/order`; `PATCH …/images/:imageId/primary`; `DELETE …/images/:imageId` |
| Tags | `GET` y `POST /admin/tags`; `PATCH /admin/tags/:id` |
| Cupones | `GET` y `POST /admin/coupons`; `GET`, `PATCH` y `DELETE /admin/coupons/:id` |
| Pedidos | `GET /admin/orders` (`status`, `payment_status`, `from`, `to`, `q`); `GET /admin/orders/:id`; `PATCH …/:id/status`; `PATCH …/:id/note` |
| Reseñas | `GET /admin/reviews` (`q`, `rating`, `hidden`); `PATCH` (`{ is_hidden }`) y `DELETE /admin/reviews/:id` |
| Usuarios | `GET /admin/users` (`q`, `role`), solo lectura |
| Auditoría | `GET /admin/audit` (`entity`, `entityId`, `action`) |

Ejemplos con `curl` en [`progreso.md`](./progreso.md), en las secciones 12.1 a 12.6.

## Reglas de negocio

- **Borrado:** un producto, una variante o un cupón con historial (pedidos o carritos; en el cupón, usos) **no se borra: se desactiva**. La respuesta lo explica: `{ deleted, deactivated, message }`.
- **Stock:** solo cambia con un movimiento con motivo:
  - `restock` suma;
  - `shrinkage` (merma) resta, y no puede dejarlo negativo;
  - `adjustment` fija el stock contado.

  Cada movimiento queda en la auditoría.
- **Precios:** positivos y con 2 decimales como máximo. `base_price` se calcula solo, como el menor precio de las variantes activas.
- **Imágenes:**
  - JPEG, PNG o WebP de hasta 2 MB; el tipo se revisa por el contenido;
  - el nombre es aleatorio y lo genera el servidor;
  - se guardan en `UPLOADS_DIR` y se sirven en `/uploads` con `nosniff` y una CSP `sandbox`;
  - borrar la imagen borra el archivo.
- **Tags de la Home:** `clasicas`, `sin-gluten`, `veganas`, `sin-azucar` y `packs` no cambian de slug.
- **Cupones:** el código va en mayúsculas y sin espacios; el porcentaje, de 1 a 100; la fecha de fin, posterior a la de inicio; los límites, no negativos; las fechas, hasta 2037 (son `TIMESTAMP` de MySQL).
- **Fechas del panel:** son días de America/Montevideo.

## Máquina de estados de los pedidos

```
pending ──► preparing ──► shipped ──► delivered
   │            │
   └──► canceled ◄┘
```

- Está en `antua-api/src/orders/order-status.ts`: una función pura, con tests.
- Los estados son los que ya existían, con los textos del panel: Pendiente, En preparación, Enviado, Entregado y Cancelado.
- **Solo se prepara un pedido pagado** (`payment_status = paid`), o uno sin pago en línea (`payment_expires_at = null`, que se hizo con los pagos deshabilitados).
- **Una transición inválida responde 409** `INVALID_TRANSITION`, con el motivo.
- **Cancelar devuelve el stock y el uso del cupón** con `releaseOrderReservation` (`src/orders/order-reservation.ts`), la misma función que usa el vencimiento de pagos.
  - Si el pago estaba pendiente, pasa a `canceled`.
  - Si estaba pagado, no se toca, y el panel avisa que hay que devolverlo desde Mercado Pago.
- **El panel nunca edita precios, totales ni el estado del pago.**
- Cada cambio queda en `order_status_history` y en la auditoría.

## Auditoría

- Hay una fila en `admin_audit_log` por cada escritura del panel: admin, acción (`product.update`, `stock.move`, `order.status`…), entidad, id, fecha y un resumen del cambio.
- Se escribe en la misma transacción que el cambio.
- `sanitizeChanges` quita cualquier clave con `password`, `token`, `hash`, `secret` o `card`.
- La nota interna de un pedido no se copia: solo su largo.

## Tests

- **API:**
  - `test/admin-auth.e2e-spec.ts`: matriz sobre **todas** las rutas `/admin` registradas (sin token → 401, `customer` → 403, admin → nunca 401 ni 403), más un controller sin `@Roles` que tiene que dar 403.
  - `admin-catalog`, `admin-coupons`, `admin-orders` y `admin-insights`: e2e por área.
  - Unit tests de reglas de stock, slug, tipos de imagen, cupones, máquina de estados, zona horaria y serie diaria.
- **Front:**
  - `e2e/admin.spec.ts` (Playwright) recorre el flujo completo de admin y verifica que un cliente no entra.
  - Unit tests del guard del layout y de la validación de formularios.
