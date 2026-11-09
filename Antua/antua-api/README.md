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
| `ADMIN_API_KEY` | No | Header `X-Admin-Key` para escribir productos y tags. Vacía, nadie puede |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | No | Credenciales **de prueba** de Mercado Pago. Sin ellas, los pagos quedan deshabilitados |
| `MP_PUBLIC_API_URL`, `MP_PUBLIC_FRONTEND_URL` | Con pagos | URLs públicas HTTPS |
| `PAYMENT_CURRENCY`, `PAYMENT_EXPIRATION_HOURS` | No | Por defecto, `UYU` y `48` |
| `PAYMENTS_SIMULATED` | No | Solo desarrollo: pagos simulados, sin internet |

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la API en modo watch (`:3000`) |
| `pnpm build` | Compila a `dist/` |
| `pnpm test` / `pnpm test:e2e` | Unitarios / e2e contra la base `antua_test` |
| `pnpm migration:generate src/database/migrations/Nombre` | Genera una migración desde los cambios en las entidades |
| `pnpm migration:run` / `:revert` / `:show` | Aplica, revierte o muestra migraciones |
| `pnpm seed` / `pnpm seed:clean --yes` | Carga o borra los datos de prueba |
| `pnpm payments:simulate <pedido> <estado>` | Envía un webhook firmado a una API simulada |

## Endpoints

| Área | Rutas |
|---|---|
| Salud | `GET /health` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me` |
| Usuario | `GET` y `PATCH /users/me` |
| Direcciones | CRUD de `/addresses` y `PATCH /addresses/:id/default` |
| Catálogo | `GET /products` (filtros: `tags`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`), `GET /products/:slug`, `GET /tags` |
| Reseñas | `GET` y `POST /products/:slug/reviews`; `PATCH` y `DELETE /products/:slug/reviews/:id` |
| Carrito | `GET /cart`, `/cart/items`, `/cart/coupon`, `/cart/merge` |
| Pedidos | `POST /orders`, `GET /orders`, `GET /orders/:id`, `GET /orders/guest/:id`, `POST /orders/:id/claim` |
| Pagos | `GET /payments/config`, `POST /orders/:id/payment`, `POST /orders/:id/payment/retry`, `GET /orders/:id/payment`, `POST /payments/webhook` |
| Newsletter | `POST /newsletter/subscribe` |

Un invitado se identifica con `X-Guest-Token` (carrito) y `X-Order-Token` (su pedido); un usuario, con `Authorization: Bearer`.

## Estructura

```text
src/
├── <módulo>/         controller, service, dto/ y entities/
├── common/           tokens seguros, política de contraseñas, guard de administración
├── config/           validación del entorno
├── database/         data source y migraciones
├── mail/             MailService y transporte de desarrollo (escribe en el log)
└── payments/         estados, proveedor de Mercado Pago, proveedor simulado, webhook, vencimientos
```

## Convenciones

- Toda escritura valida su entrada con un DTO, y el `ValidationPipe` global descarta los campos desconocidos.
- Los datos sensibles llevan `@Exclude` y, si no deben salir nunca, también `select: false`.
- Lo ajeno responde 404, no 403: así no se revela qué existe.
- Los cambios de esquema van siempre por migración.
- Los logs llevan ids, nunca datos personales.
