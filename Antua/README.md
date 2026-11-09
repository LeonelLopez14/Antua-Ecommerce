# Antojarte (Antua)

E-commerce de práctica de galletas caseras: catálogo con filtros, carrito para invitados y usuarios, checkout en 4 pasos, cuenta con pedidos y direcciones, reseñas y pagos de prueba con Mercado Pago.

Es un monorepo con pnpm:

| Paquete | Qué es | Más información |
|---|---|---|
| [`antua-api`](./antua-api) | API REST con NestJS, TypeORM y MySQL | [README](./antua-api/README.md) |
| [`antua-web`](./antua-web) | Tienda con React, TypeScript, Vite, Tailwind, GSAP y Three.js | [README](./antua-web/README.md) |

## Requisitos

- Node.js 24 y pnpm 11 (`corepack enable`)
- Docker

## Correr todo desde cero

### Opción A: la base en Docker y el código en tu máquina

```bash
pnpm install

# 1. Base de datos: MySQL 8 en 127.0.0.1:3307
#    (el 3306 suele estar ocupado por otro MySQL o MariaDB del sistema)
cp .env.example .env                    # completar DB_PASSWORD
docker compose up -d db

# 2. API
cp antua-api/.env.example antua-api/.env   # completar DB_PASSWORD y JWT_SECRET
pnpm --filter antua-api seed               # aplica las migraciones y carga los datos de prueba
pnpm dev:api                               # http://localhost:3000

# 3. Front, en otra terminal
cp antua-web/.env.example antua-web/.env
pnpm dev:web                               # http://localhost:5173
```

### Opción B: todo en Docker

```bash
cp .env.example .env
cp antua-api/.env.example antua-api/.env
docker compose --profile web up -d --build
```

Los puertos son configurables en `.env` (`MYSQL_PORT`, `API_PORT`, `WEB_PORT`). El archivo `docker-compose.yml` no contiene credenciales.

Si ya tenés otro contenedor usando el 3307, detenelo o cambiá `MYSQL_PORT`.

Para cargar los datos de prueba en la opción B, corré el seed desde tu máquina, apuntando al puerto publicado (`pnpm --filter antua-api seed`).

### Salud del servicio

`GET http://localhost:3000/health` responde `{"status":"ok","database":"up"}`.

## Migraciones y datos de prueba

El esquema se gestiona con migraciones de TypeORM (`antua-api/src/database/migrations`), que se aplican solas al arrancar la API.

| Comando (con `pnpm --filter antua-api`) | Qué hace |
|---|---|
| `migration:show` | Muestra qué migraciones faltan |
| `migration:run` | Aplica las pendientes |
| `migration:revert` | Revierte la última |
| `seed` | Carga productos, tags, cupones y usuarios de prueba. Se puede repetir. |
| `seed:clean --yes` | Borra los datos de prueba y los pedidos que los incluyan |

Datos de prueba: cupones `SEED10` (−10 %, mínimo 5000), `SEEDFIJO` (−1000) y `SEEDVENCIDO`; usuario `seed.cliente@antua.test` con contraseña `SeedPass123!` (solo desarrollo; se cambia con `SEED_PASSWORD`).

## Tests

| Dónde | Comando | Requiere |
|---|---|---|
| API, unitarios | `pnpm --filter antua-api test` | Nada |
| API, e2e | `pnpm --filter antua-api test:e2e` | MySQL con una base vacía `antua_test` |
| Front, unitarios | `pnpm --filter antua-web test` | Nada |
| Front, e2e | `pnpm --filter antua-web test:e2e` | API con los datos de prueba. La primera vez: `pnpm --filter antua-web exec playwright install chromium` |

Los e2e de la API se niegan a vaciar cualquier base que no sea `antua_test`. Para crearla:

```bash
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS antua_test"'
DB_DATABASE=antua_test pnpm --filter antua-api migration:run
```

## Estructura

```text
.
├── antua-api/            API (NestJS)
│   ├── src/<módulo>/     controller, service, dto/ y entities/ por módulo
│   ├── src/database/     data source y migraciones
│   ├── scripts/          seed, limpieza y simulador de webhooks
│   └── test/             e2e contra la base antua_test
├── antua-web/            Tienda (React)
│   ├── src/              ver CLAUDE.md para las convenciones
│   ├── e2e/              flujo principal con Playwright
│   └── docs/             progreso, estado y diseño de pagos
└── docker-compose.yml    base de datos, API y front opcional
```

## Decisiones técnicas principales

- **El backend calcula todos los montos.** El front nunca suma precios ni manda un total. Si un precio cambia entre el carrito y la compra, el pedido no se crea y se pide confirmar.
- **Compra sin cuenta.** El carrito de invitado se identifica con un token. Cada pedido de invitado recibe un token propio que permite verlo y vincularlo a una cuenta; **nunca se vincula por email**, porque el email no está verificado.
- **Migraciones en vez de `synchronize`,** para que un cambio de entidad nunca borre datos sin avisar.
- **Fechas en UTC** en la conexión con MySQL.
- **Pagos con Mercado Pago Checkout Pro:** ningún dato de tarjeta pasa por este sistema. El estado del pago lo define solo el servidor (webhook firmado y consulta al proveedor), nunca la URL de retorno. Solo admite credenciales de prueba. Ver [`antua-web/docs/payments-design.md`](./antua-web/docs/payments-design.md).
- **Secretos solo en `.env`,** que nunca se versiona. La API valida su configuración al arrancar y explica qué falta.

Documentación de trabajo: [`progreso.md`](./antua-web/docs/progreso.md) (qué se hizo y por qué) y [`estado-frontend.md`](./antua-web/docs/estado-frontend.md) (foto actual).
