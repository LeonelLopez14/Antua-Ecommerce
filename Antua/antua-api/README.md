# antua-api

API REST de Antojarte: NestJS 11, TypeORM y MySQL 8. Para correr todo desde cero, ver el [README de la raíz](../README.md).

## Configuración

Copiá `.env.example` a `.env`. La API valida el entorno al arrancar (`src/config/env.validation.ts`): si algo falta o está mal, no levanta y dice qué corregir.

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Sí | Conexión a MySQL |
| `JWT_SECRET` | Sí | 32 caracteres o más |
| `JWT_EXPIRES_IN` | Sí | Vencimiento, por ejemplo `7d` |
| `SHIPPING_FLAT_RATE` | Sí | Costo de envío fijo |
| `SHIPPING_ETA_DAYS` | No | Plazo estimado en días; vacía, no se muestra |
| `FRONTEND_URL` | No | Links de los mails. Por defecto, `http://localhost:5173` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma; nunca `*` |
| `PUBLIC_URL` | En producción | URL pública del sitio para los enlaces de los correos y el sitemap. Si falta, se usa `FRONTEND_URL` |
| `MAIL_TRANSPORT` | No | `log` (por defecto, no envía) o `smtp` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` | Con `smtp` | Servidor SMTP y remitente (`Antojarte <pedidos@dominio>`) |
| `MAIL_SECURE` | No | `true` = TLS directo; vacío = `true` solo en el puerto 465 |
| `MAIL_USER`, `MAIL_PASSWORD` | Con `smtp` en producción | Van juntas; en desarrollo (Mailpit) pueden faltar |
| `TRUST_PROXY` | No | Proxies delante de la API (`1` detrás de Caddy) o lista de redes; nunca `true`. Así el límite de intentos usa la IP real del cliente |
| `UPLOADS_DIR` | No | Carpeta de las imágenes del panel. Por defecto `uploads/` (en `.gitignore`); nunca dentro de `src/` |
| `LOW_STOCK_THRESHOLD` | No | Umbral de "stock bajo" del panel. Por defecto `5` |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | No | Credenciales **de prueba** de Mercado Pago. Sin ellas, los pagos quedan deshabilitados |
| `MP_PUBLIC_API_URL`, `MP_PUBLIC_FRONTEND_URL` | Con pagos | URLs públicas HTTPS |
| `PAYMENT_CURRENCY`, `PAYMENT_EXPIRATION_HOURS` | No | Por defecto, `UYU` y `48` |
| `PAYMENTS_SIMULATED` | No | Solo desarrollo: pagos simulados, sin internet |

**Con `NODE_ENV=production`** (la imagen de Docker ya lo trae) las reglas se endurecen: `DB_*` y `FRONTEND_URL` (HTTPS) son obligatorias, `DB_USERNAME` no puede ser `root`, `JWT_SECRET` y `DB_PASSWORD` no pueden ser de ejemplo ni débiles, y `SEED_ADMIN_PASSWORD` tiene que estar vacía. Despliegue: [`antua-web/docs/despliegue.md`](../antua-web/docs/despliegue.md).

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la API en modo watch (`:3000`) |
| `pnpm build` | Compila a `dist/` |
| `pnpm build:tools` | Compila `admin:create`, el seed y la nutrición a `dist-tools/` (los usa la imagen de producción, que no tiene ts-node) |
| `pnpm lint:check` | ESLint sin `--fix` (el de la CI) |
| `pnpm test` / `pnpm test:e2e` | Unitarios / e2e contra la base `antua_test` |
| `pnpm migration:generate src/database/migrations/Nombre` | Genera una migración desde los cambios en las entidades |
| `pnpm migration:run` / `:revert` / `:show` | Aplica, revierte o muestra migraciones. **La API no migra sola**: leé la migración y aplicala con `migration:run` |
| `pnpm migration:run:dist` | Aplica las migraciones con el código compilado (Docker o producción) |
| `pnpm admin:create` | Crea un administrador (pide los datos o usa `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`). `--promote` asciende una cuenta existente |
| `pnpm nutrition:examples --dry-run` / `--yes` / `--undo --yes` | Carga (o deshace) información nutricional de ejemplo, solo en campos vacíos |
| `pnpm seed` / `pnpm seed:clean --yes` | Carga o borra los datos de prueba (con `SEED_ADMIN_PASSWORD`, también un admin de desarrollo) |
| `pnpm seed --catalog-only` | Solo tags y productos, sin usuarios, cupones ni reseñas. Es el único modo que corre en producción |
| `pnpm payments:simulate <pedido> <estado>` | Envía un webhook firmado a una API simulada |
| `pnpm payments:check` | Revisa la configuración de Mercado Pago sin conectarse (ver `antua-web/docs/mercadopago-prueba.md`) |

## Endpoints

| Área | Rutas |
|---|---|
| Salud | `GET /health` |
| SEO | `GET /sitemap.xml` (páginas públicas y productos activos), `GET /robots.txt` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me` |
| Usuario | `GET` y `PATCH /users/me` |
| Direcciones | CRUD de `/addresses` y `PATCH /addresses/:id/default` |
| Catálogo | `GET /products` (filtros: `tags`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`), `GET /products/:slug`, `GET /tags` |
| Reseñas | `GET` y `POST /products/:slug/reviews`; `PATCH` y `DELETE /products/:slug/reviews/:id` |
| Carrito | `GET /cart`, `/cart/items`, `/cart/coupon`, `/cart/merge` |
| Pedidos | `POST /orders`, `GET /orders`, `GET /orders/:id`, `GET /orders/guest/:id`, `POST /orders/:id/claim` |
| Pagos | `GET /payments/config`, `POST /orders/:id/payment`, `POST /orders/:id/payment/retry`, `GET /orders/:id/payment`, `POST /payments/webhook` |
| Newsletter | `POST /newsletter/subscribe` |
| Panel (solo admins) | `/admin/stats`, `/admin/products` (variantes, stock e imágenes), `/admin/tags`, `/admin/coupons`, `/admin/orders`, `/admin/reviews`, `/admin/users`, `/admin/audit`, `/admin/exports/orders.csv` y `/admin/exports/products.csv`. Detalle en [`antua-web/docs/admin.md`](../antua-web/docs/admin.md) |
| Imágenes subidas | `GET /uploads/products/<archivo>` (estático) |

Un invitado se identifica con `X-Guest-Token` (carrito) y `X-Order-Token` (su pedido); un usuario, con `Authorization: Bearer`.

## Estructura

```text
src/
├── <módulo>/         controller, service, dto/ y entities/
├── admin/            panel: guard de roles, auditoría, catálogo, cupones, pedidos, métricas, moderación
├── common/           tokens seguros, política de contraseñas, hora de la tienda
├── config/           validación del entorno
├── database/         data source y migraciones
├── mail/             MailService (reintento, log sin datos personales), transportes log y SMTP, plantillas
├── notifications/    correos de pedidos (confirmación y cambios de estado), después de cada transacción
├── admin/exports/    exportaciones CSV (streaming, anti-fórmulas, auditoría)
├── seo/              sitemap.xml y robots.txt
└── payments/         estados, proveedor de Mercado Pago, proveedor simulado, webhook, vencimientos
```

## Convenciones

- Toda escritura valida su entrada con un DTO, y el `ValidationPipe` global descarta los campos desconocidos.
- Los datos sensibles llevan `@Exclude` y, si no deben salir nunca, también `select: false`.
- Lo ajeno responde 404, no 403: así no se revela qué existe.
- Los cambios de esquema van siempre por migración.
- Los logs llevan ids, nunca datos personales.
- Toda ruta de administración va bajo `/admin` con `@AdminController`: el guard global niega por defecto, y `test/admin-auth.e2e-spec.ts` falla si alguna queda abierta.
