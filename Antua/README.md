# Antojarte

E-commerce de práctica de galletas caseras: catálogo con filtros, carrito para invitados y usuarios, checkout en 4 pasos, cuenta con pedidos y direcciones, reseñas, pagos de prueba con Mercado Pago y un panel de administración en `/admin`.

Es un monorepo con pnpm:

| Paquete | Qué es | Más información |
|---|---|---|
| [`antua-api`](./antua-api) | API REST con NestJS, TypeORM y MySQL | [README](./antua-api/README.md) |
| [`antua-web`](./antua-web) | Tienda con React, TypeScript, Vite, Tailwind, GSAP y Three.js | [README](./antua-web/README.md) |

## Requisitos

- Node.js 24 y pnpm 10 (`npm i -g pnpm@10`; Docker y la CI usan 10.34.9)
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
pnpm --filter antua-api migration:show     # qué migraciones faltan (leelas antes de aplicarlas)
pnpm --filter antua-api migration:run      # aplica las pendientes: la API no lo hace sola
pnpm --filter antua-api seed               # carga los datos de prueba
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
# La API no migra sola: aplicá las migraciones (después de leerlas) con el código compilado de la imagen
docker compose run --rm api node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

Los puertos son configurables en `.env` (`MYSQL_PORT`, `API_PORT`, `WEB_PORT`). El archivo `docker-compose.yml` no contiene credenciales.

Si ya tenés otro contenedor usando el 3307, detenelo o cambiá `MYSQL_PORT`.

Para cargar los datos de prueba en la opción B, corré el seed desde tu máquina, apuntando al puerto publicado (`pnpm --filter antua-api seed`).

### Producción (servidor con Docker y HTTPS)

`docker-compose.prod.yml`: base privada, API y Caddy (front estático, `/api` y HTTPS), con usuarios de base de mínimo privilegio, respaldos automáticos y cabeceras de seguridad. La guía paso a paso, con la explicación de cada pieza, está en [`antua-web/docs/despliegue.md`](./antua-web/docs/despliegue.md).

```bash
cp .env.prod.example .env.prod && chmod 600 .env.prod
./scripts/generate-secrets.sh                      # copiá los valores a .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d db
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate   # después de leer las migraciones
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Panel de administración

El primer admin se crea en el servidor; nadie puede volverse admin desde la web:

```bash
pnpm --filter antua-api admin:create      # pide email, nombre y contraseña
```

Después, entrá a `http://localhost:5173/admin`. Roles, endpoints y estados de pedidos: [`antua-web/docs/admin.md`](./antua-web/docs/admin.md).

Las imágenes que se suben desde el panel van a `UPLOADS_DIR` (por defecto `antua-api/uploads/`, que no se versiona). En Docker van al volumen `uploads_data`.

### Salud del servicio

`GET http://localhost:3000/health` responde `{"status":"ok","database":"up"}`.

## Migraciones y datos de prueba

El esquema se gestiona con migraciones de TypeORM (`antua-api/src/database/migrations`). **La API no las aplica sola al arrancar** (`migrationsRun: false`). Una migración nueva se lee y recién después se aplica con `migration:run`. Si falta alguna, la API lo avisa en el log y el seed se niega a correr.

**Por qué:** `migration:generate` puede escribir `DROP COLUMN` + `ADD COLUMN` cuando en realidad solo se amplía una columna, y eso borra datos. Con la aplicación automática y `pnpm dev` en modo watch, una migración recién generada llegaba a la base en segundos, antes de poder leerla. En la Fase 12 así se vaciaron los ingredientes y alérgenos (se restauraron desde un respaldo).

| Comando (con `pnpm --filter antua-api`) | Qué hace |
|---|---|
| `migration:show` | Muestra qué migraciones faltan |
| `migration:run` | Aplica las pendientes |
| `migration:revert` | Revierte la última |
| `migration:run:dist` | Igual que `migration:run`, pero con el código compilado (`dist/`). En producción se usa el servicio `migrate` (ver la guía de despliegue) |
| `seed` | Carga productos, tags, cupones y usuarios de prueba. Se puede repetir. |
| `seed:clean --yes` | Borra los datos de prueba, los pedidos que los incluyan y las imágenes subidas a esos productos |
| `admin:create` | Crea el primer administrador (ver arriba) |
| `nutrition:examples --yes` | Carga información nutricional de ejemplo en los campos vacíos (`--undo --yes` la quita) |

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
├── deploy/             Caddy (proxy y HTTPS), usuarios de MySQL y timer de respaldos
├── scripts/            secretos, respaldo/restauración y verificaciones (cabeceras, repo)
├── docker-compose.yml  desarrollo: base de datos, API y front opcional
└── docker-compose.prod.yml  producción: db privada, API y proxy con HTTPS
```

## Decisiones técnicas principales

- **El backend calcula todos los montos.** El front nunca suma precios ni manda un total. Si un precio cambia entre el carrito y la compra, el pedido no se crea y se pide confirmar.
- **Compra sin cuenta.** El carrito de invitado se identifica con un token. Cada pedido de invitado recibe un token propio que permite verlo y vincularlo a una cuenta; **nunca se vincula por email**, porque el email no está verificado.
- **Migraciones en vez de `synchronize`,** para que un cambio de entidad nunca borre datos sin avisar.
- **Fechas en UTC** en la conexión con MySQL.
- **Pagos con Mercado Pago Checkout Pro:** ningún dato de tarjeta pasa por este sistema. El estado del pago lo define solo el servidor (webhook firmado y consulta al proveedor), nunca la URL de retorno. Solo admite credenciales de prueba. Ver [`antua-web/docs/payments-design.md`](./antua-web/docs/payments-design.md).
- **Roles, no claves compartidas:** el panel exige un JWT con rol `admin`, leído de la base en cada request. Toda ruta `/admin` se niega por defecto, y un test recorre todas para verificarlo.
- **Moneda única:** pesos uruguayos (UYU, `es-UY`) en toda la app y en los pagos.
- **Secretos solo en `.env`,** que nunca se versiona. La API valida su configuración al arrancar y explica qué falta.

Integración continua: `.github/workflows/ci.yml` (en la raíz del repo) verifica front, API, e2e de la API, imágenes y archivos prohibidos en cada PR; Dependabot propone actualizaciones cada semana.

Control de calidad (Lighthouse, accesibilidad, resiliencia): [`antua-web/docs/qa/informe-qa.md`](./antua-web/docs/qa/informe-qa.md).

Documentación de trabajo: [`progreso.md`](./antua-web/docs/progreso.md) (qué se hizo y por qué) y [`estado-frontend.md`](./antua-web/docs/estado-frontend.md) (foto actual).
