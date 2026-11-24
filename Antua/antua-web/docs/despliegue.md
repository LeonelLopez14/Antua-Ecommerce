# Despliegue de Antojarte (Fase 14)

Guía para poner Antojarte en marcha en **srv-proyecto** (Linux con Docker), y explicación de cada pieza de la infraestructura. Todo se construyó y probó en local; los resultados están en [Qué se probó](#qué-se-probó-en-local).

> **Antes de empezar: esto es un proyecto de práctica.**
> - Los pagos reales **no** están conectados: la API se niega a activar Mercado Pago con `NODE_ENV=production`.
> - Los Términos y la Política de privacidad son **borradores**.
> - El correo `contacto@antojarte.example` no existe.
> - Los correos (confirmación de pedido, cambios de estado y recuperación de contraseña) salen solo si configurás un SMTP (`MAIL_TRANSPORT=smtp`, ver [Correo](#correo)). Con `log` no se envía nada.
>
> Lo recomendable es mantenerlo **en la red local o con acceso restringido** (modo `internal`, `PROXY_BIND` en una IP privada y firewall) hasta decidir lo contrario. Abrirlo a internet es una decisión tuya: ver [la lista de verificación](#7-antes-de-abrir-al-público).

## Índice

- [Cómo está armado](#cómo-está-armado)
- [Qué hace cada pieza](#qué-hace-cada-pieza)
- [Guía paso a paso](#guía-paso-a-paso)
  1. [Requisitos y puertos](#1-requisitos-del-servidor-y-puertos)
  2. [Código, secretos y primer arranque](#2-código-secretos-y-primer-arranque)
  3. [Migraciones, primer admin y datos de ejemplo](#3-migraciones-primer-admin-y-datos-de-ejemplo)
  4. [HTTPS](#4-https)
  5. [Respaldos](#5-respaldos)
  6. [Actualizar y volver atrás](#6-actualizar-a-una-versión-nueva-y-volver-atrás)
  7. [Antes de abrir al público](#7-antes-de-abrir-al-público)
  8. [Operación diaria](#8-operación-diaria)
- [Verificar el despliegue](#verificar-el-despliegue)
- [Actualizar las imágenes base](#actualizar-las-imágenes-base)
- [Integración continua](#integración-continua)
- [Qué se probó en local](#qué-se-probó-en-local)
- [Riesgos y límites](#riesgos-y-límites)

## Cómo está armado

```text
            internet / red local
                     │  (solo los puertos HTTP_PORT y HTTPS_PORT, en PROXY_BIND)
             ┌───────▼────────┐
             │  proxy (Caddy) │  sirve el front · HTTPS · /api → api:3000
             └───────┬────────┘
     red "frontend"  │
             ┌───────▼────────┐
             │  api (NestJS)  │  usuario de base antua_app (solo datos)
             └───────┬────────┘
     red "backend"   │  (interna: sin salida a internet ni acceso desde el host)
             ┌───────▼────────┐
             │  db (MySQL 8.4)│  SIN puertos publicados
             └────────────────┘
```

Archivos:

| Archivo | Qué es |
|---|---|
| `docker-compose.prod.yml` | Los tres servicios, el servicio puntual `migrate`, redes y volúmenes |
| `.env.prod.example` | Plantilla de todas las variables. Tu copia, `.env.prod`, nunca se versiona |
| `antua-api/Dockerfile` | Imagen de la API |
| `antua-web/Dockerfile` | Imagen del proxy: front compilado + Caddy |
| `deploy/caddy/` | `Caddyfile` y los dos modos de HTTPS (`modes/internal.caddy`, `modes/public.caddy`) |
| `deploy/mysql/initdb/01-create-users.sh` | Crea los usuarios de base con mínimo privilegio |
| `deploy/systemd/` | Servicio y timer del respaldo diario |
| `scripts/generate-secrets.sh` | Genera secretos aleatorios |
| `scripts/backup-db.sh`, `scripts/restore-db.sh` | Respaldo y restauración |
| `scripts/check-headers.sh` | Revisa cabeceras de seguridad, caché y compresión |
| `scripts/check-repo.sh` | Guardia: archivos prohibidos y secretos en el repo |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | Integración continua y actualizaciones propuestas |

El `docker-compose.yml` de la raíz sigue siendo el de **desarrollo**: no se mezcla con este.

## Qué hace cada pieza

### La imagen de la API (`antua-api/Dockerfile`)

Una imagen es una "foto" con todo lo necesario para correr un programa. Esta se arma **en etapas** (multi-etapa):

1. **base:** Node 24 y pnpm, con versiones fijas.
2. **deps:** instala *todas* las dependencias, porque hacen falta para compilar. Primero copia solo los `package.json` y el lockfile: si cambiás código pero no dependencias, Docker reutiliza esta etapa y el build es más rápido.
3. **build:** compila la API a `dist/` y los scripts de operación (`admin:create`, seed y nutrición) a `dist-tools/`. La imagen final no tiene `ts-node`, así que esos scripts tienen que estar en JavaScript.
4. **prod-deps:** instala solo las dependencias de producción.
5. **runtime:** parte de un Node limpio y copia **solo** `dist/`, `dist-tools/` y las dependencias de producción.

Así la imagen final no lleva TypeScript fuente, tests, ESLint, Jest ni pnpm. Además:
- **Corre como el usuario `node`, no como root.** Si alguien lograra ejecutar algo adentro, tendría pocos permisos.
- **El código es de root y de solo lectura** para `node`. En compose, además, el sistema de archivos del contenedor es de solo lectura (`read_only: true`): la API solo puede escribir en el volumen de subidas y en `/tmp`.
- **`NODE_ENV=production`** activa las reglas estrictas de configuración (ver [Secretos](#secretos-y-validación)).
- **`HEALTHCHECK`:** Docker consulta `/health` cada 15 s. "healthy" quiere decir que la API y la base responden.
- **No hay secretos adentro.** Los secretos llegan como variables de entorno al arrancar; `Dockerfile.dockerignore` evita que un `.env`, una clave o un respaldo entren al build por error.
- Se borran `npm` y `corepack`: no hacen falta para correr.

Detalle conocido: `typescript` y `ts-node` aparecen en `node_modules` porque TypeORM los declara como dependencias opcionales. No se usan en producción.

### La imagen del proxy (`antua-web/Dockerfile`)

1. **build (Node):** compila la tienda con Vite. `VITE_API_URL=/api` queda fijo en el JavaScript: el navegador le habla a la API **en el mismo dominio** que el front, así que no hace falta CORS.
2. **runtime (Caddy):** copia el resultado a `/srv` y la configuración a `/etc/caddy`. Al construir corre `caddy validate`: un error en el Caddyfile rompe el build y nunca llega al servidor.

Para una API en otro dominio (no es el caso de este despliegue): `--build-arg VITE_API_URL=https://api.otro-dominio`, y `CORS_ORIGINS` en la API.

El servidor de desarrollo de Vite en Docker pasó a `antua-web/Dockerfile.dev`.

### Caddy (`deploy/caddy/Caddyfile`)

Caddy es un servidor web que consigue y renueva certificados HTTPS solo. Hace cinco cosas:

1. **Rutas:**
   - `/api/*` → la API (sin el prefijo: `/api/products` llega como `/products`).
   - `/assets/*` → archivos de Vite. Si no existe uno, da 404, nunca `index.html` (si no, el navegador lo leería como JavaScript).
   - `/sitemap.xml` y `/robots.txt` → la API, que los arma con `PUBLIC_URL` y los productos activos.
   - Todo lo demás → el archivo si existe (`favicon.svg`, `theme-init.js`, `hero-cookie.webp`) o, si no, `index.html`. Ese es el **fallback de SPA**: `/tienda` o `/cuenta/pedidos` las resuelve React.
2. **HTTPS**, en dos modos (ver [paso 4](#4-https)).
3. **Cabeceras de seguridad** en las páginas:

   | Cabecera | Para qué |
   |---|---|
   | `Content-Security-Policy` | Solo se carga lo del mismo origen. Un script inyectado por un atacante no corre. Sin `unsafe-inline` ni `unsafe-eval` (ver abajo) |
   | `X-Content-Type-Options: nosniff` | El navegador no "adivina" tipos de archivo |
   | `Referrer-Policy: strict-origin-when-cross-origin` | A otros sitios solo les llega el dominio, no la ruta |
   | `Permissions-Policy` | Apaga cámara, micrófono, ubicación, etc. |
   | `X-Frame-Options: DENY` y `frame-ancestors 'none'` | Nadie puede meter el sitio en un iframe (clickjacking) |
   | `Strict-Transport-Security` | Solo en modo `public`: el navegador recuerda un año que el sitio va por HTTPS. Sin `preload` |

   La CSP permite `img-src data:` (las imágenes de ejemplo del seed son SVG en `data:`) y `blob:` (la vista previa de una imagen antes de subirla en el panel). Para poder prohibir los scripts en línea, el script del tema salió de `index.html` a `public/theme-init.js`. Three.js, GSAP y React cambian estilos por el DOM (`element.style`), y eso la CSP no lo bloquea, así que tampoco hace falta `unsafe-inline` en `style-src`. Lo verifica `e2e/csp.spec.ts`.

   `/api` lleva las cabeceras que pone la API (helmet). Las imágenes subidas tienen una CSP propia más estricta (`default-src 'none'; sandbox`).
4. **Compresión** zstd o gzip.
5. **Caché:**
   - `/assets/*` y las imágenes subidas: un año, `immutable`. Sus nombres cambian si cambia el contenido.
   - `index.html` y lo demás: `no-cache`. Un deploy nuevo se ve enseguida.

Además, redirige HTTP → HTTPS manteniendo el puerto configurado. El **log de accesos** (JSON) no guarda llaves de acceso: borra los headers `X-Order-Token` y `X-Guest-Token` y el `?token=` de la URL de recuperación. `Authorization` y las cookies, Caddy ya las oculta solo.

### Docker Compose de producción (`docker-compose.prod.yml`)

- **`name: antojarte`:** contenedores `antojarte-db-1`, `antojarte-api-1`, `antojarte-proxy-1` y volúmenes `antojarte_*`. No chocan con nada de desarrollo ni con otros proyectos.
- **Redes:**
  - `backend` es **interna**: la base no tiene salida a internet ni se puede alcanzar desde el host.
  - La base **no publica ningún puerto**. No hay conflicto posible con el MariaDB del 3306.
  - La API tampoco publica: solo le habla el proxy.
- **Puertos:** solo los del proxy, configurables (`HTTP_PORT`, `HTTPS_PORT`) y enlazados por defecto a `127.0.0.1` (`PROXY_BIND`).
- **Volúmenes con nombre:**
  - `db_data`: los datos de MySQL;
  - `uploads_data`: las imágenes del panel;
  - `caddy_data` y `caddy_config`: certificados y la CA interna.

  Sobreviven a reinicios y a `docker compose down` **sin** `-v`.
- **`restart: unless-stopped`:** si un contenedor se cae, Docker lo levanta de nuevo, salvo que lo hayas detenido vos.
- **`healthcheck` y `depends_on: condition: service_healthy`:** la API arranca recién con la base lista, y el proxy, recién con la API sana.
- **Logs:** `json-file` con rotación (5 archivos de 10 MB por contenedor). El disco no se llena.
- **Límites de memoria:** db 1 GB, api 512 MB, proxy 256 MB (configurables).
- **Endurecimiento:**
  - `cap_drop: ALL`: el contenedor pierde los permisos especiales de Linux;
  - `no-new-privileges`;
  - API de solo lectura.
- **`migrate`:** un servicio que no arranca con `up` (perfil `tools`). Se corre a mano y usa el usuario de migraciones.

### Usuarios de base (`deploy/mysql/initdb/01-create-users.sh`)

| Usuario | Puede | Lo usa |
|---|---|---|
| `antua_app` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` en `antua_db` | La API, siempre |
| `antua_migrator` | Lo anterior, más `CREATE`, `ALTER`, `DROP`, `INDEX`… | Solo `run --rm migrate` |
| `antua_backup` | Solo lectura (`SELECT`, `SHOW VIEW`, `LOCK TABLES`…) | `backup-db.sh` |
| `root` | Todo, pero **solo desde adentro del contenedor** (`MYSQL_ROOT_HOST=localhost`) | `restore-db.sh` y administración |

**Por qué:** si alguien encontrara una falla en la API, con `antua_app` no podría borrar tablas ni cambiar el esquema. Y una migración nunca corre "sin querer": la API no tiene permiso para eso. Se comprobó en local que `antua_app` recibe `CREATE command denied`.

El script corre solo la primera vez, con el volumen vacío. Para una base ya existente, ver [paso 3](#usuarios-en-una-base-existente).

### Secretos y validación

- `.env.prod` tiene los secretos. Nunca se versiona (`.gitignore`) y debe tener permisos `600`.
- `scripts/generate-secrets.sh` genera valores con `openssl rand` y los **muestra**: no escribe archivos ni deja logs.
- Con `NODE_ENV=production`, la API **no arranca** si:
  - faltan `DB_*` o `PUBLIC_URL` (antes `FRONTEND_URL`, que sigue sirviendo);
  - se conecta como `root`;
  - `JWT_SECRET` o `DB_PASSWORD` son de ejemplo, cortos, repetitivos o solo dígitos;
  - `PUBLIC_URL` no es HTTPS;
  - `MAIL_TRANSPORT=smtp` y falta alguna de las seis variables `MAIL_*`;
  - queda `SEED_ADMIN_PASSWORD`.

  En cada caso dice qué corregir. Ver `antua-api/src/config/env.validation.ts`.
- Compose se niega a arrancar si falta una variable obligatoria (`${VAR:?mensaje}`).

### Correo

- **`MAIL_TRANSPORT=log`** (valor por defecto): no se envía nada; la API lo avisa en el log. **`smtp`**: se envía con tu proveedor.
- **Qué correos salen:**
  - la **confirmación** de cada pedido (número, ítems, totales, dirección y plazo);
  - el aviso cuando el panel cambia el estado (en preparación, enviado, entregado, cancelado);
  - la **recuperación de contraseña**.
- **Pedidos de invitado:** la confirmación trae el enlace `/pedido/<id>#t=<token>`, que es la forma de ver su pedido. El token va después de `#`, que el navegador nunca manda al servidor.
- **Un correo que falla nunca rompe un pedido** ni un cambio de estado: se reintenta una vez y queda en el log solo el tipo, el número de pedido y el código del error (sin direcciones ni contenido).
- **Variables** (en `.env.prod`):
  - `MAIL_HOST`, `MAIL_PORT` (587 con STARTTLS o 465 con `MAIL_SECURE=true`);
  - `MAIL_USER` y `MAIL_PASSWORD` (la credencial SMTP de tu proveedor);
  - `MAIL_FROM` (por ejemplo `Antojarte <pedidos@tu-dominio.com>`).

  En producción son obligatorias las seis: si falta una, la API no arranca y dice cuál.
- **Entregabilidad** (que no caigan en spam): depende del dominio de `MAIL_FROM` y del proveedor, no del código. Hacen falta tres registros en el DNS del dominio, que te da tu proveedor:
  - **SPF**: qué servidores pueden mandar por tu dominio;
  - **DKIM**: firma de cada correo;
  - **DMARC**: qué hacer con los que fallan.

  Sin un dominio propio verificado en el proveedor, lo más probable es que terminen en spam.
- **En desarrollo:** Mailpit muestra los correos en el navegador sin enviar nada: `docker compose --profile mail up -d mailpit` y http://127.0.0.1:8025 (ver `antua-api/.env.example`).

### Respaldos

Ver [paso 5](#5-respaldos).

**`backup-db.sh`:**
- vuelca la base con el usuario de solo lectura (`--single-transaction`: copia consistente sin frenar la tienda) y la comprime;
- **verifica** que no esté vacía ni cortada (busca la última línea, `-- Dump completed`);
- empaqueta las imágenes;
- guarda todo con fecha, fuera del repo, con permisos 700/600;
- borra los de más de 14 días.

La contraseña nunca aparece en `ps`: va por `MYSQL_PWD` **dentro** del contenedor.

**`restore-db.sh`:**
- verifica el archivo;
- se niega a pisar una base con datos salvo `--force` (y entonces hace antes un respaldo de seguridad);
- pide escribir el nombre de la base;
- detiene la API, recrea la base, carga y levanta todo.

### Integración continua

Ver [Integración continua](#integración-continua).

## Guía paso a paso

En todos los comandos, `$DC` es:

```bash
DC="docker compose -f docker-compose.prod.yml --env-file .env.prod"
```

Agregalo a tu `~/.bashrc` o definilo en cada sesión, desde la carpeta `Antua/` del repo.

### 1. Requisitos del servidor y puertos

- **Docker Engine 24 o más nuevo** y el plugin **Compose v2.24 o más**: `docker version` y `docker compose version`.
- `git` y `openssl`: `sudo apt install git openssl`.
- **Memoria:** 2 GB libres (los límites suman ~1,8 GB).
- **Disco:** 10 GB libres. Las imágenes ocupan ~0,5 GB, más la base, las subidas y los respaldos.
- Un usuario propio, sin privilegios, que pueda usar Docker:

  ```bash
  sudo adduser --disabled-password antojarte
  sudo usermod -aG docker antojarte
  ```

  Ojo: el grupo `docker` equivale a root en la práctica; es el costo de no usar `sudo` para cada comando.

**Puertos.** La base y la API no publican nada, así que el único puerto a elegir es el del proxy. Revisá qué está ocupado:

```bash
sudo ss -ltnp | grep -E ':(80|443|8080|8443)\b'   # ¿quién escucha en esos puertos?
sudo ss -ltnp | grep ':3306'                         # el MariaDB del sistema: no se toca
docker ps --format '{{.Names}}\t{{.Ports}}'          # contenedores de otros proyectos
```

- Si 80 y 443 están libres y vas a usar un dominio público: `HTTP_PORT=80`, `HTTPS_PORT=443`.
- Si están ocupados (por otro servicio que no se toca): usá otros, por ejemplo `HTTP_PORT=8080` y `HTTPS_PORT=8443`, en modo `internal`. Con un dominio público hacen falta 80 y 443.
- Nada de este proyecto usa el 3306: no hay conflicto con MariaDB.

### 2. Código, secretos y primer arranque

```bash
sudo mkdir -p /opt/antojarte && sudo chown antojarte: /opt/antojarte
sudo -iu antojarte
git clone https://github.com/LeonelLopez14/Antua-Ecommerce.git /opt/antojarte
cd /opt/antojarte/Antua
git checkout main            # o la rama/tag que quieras desplegar

cp .env.prod.example .env.prod
chmod 600 .env.prod
./scripts/generate-secrets.sh   # copiá cada línea en .env.prod, reemplazando las EJEMPLO
nano .env.prod                  # SITE_ADDRESS, HTTPS_MODE, PUBLIC_URL, puertos (paso 4) y correo (MAIL_*)
```

Revisá que no quede ningún `EJEMPLO`: `grep EJEMPLO .env.prod` no tiene que mostrar nada (salvo el comentario del principio).

Construir y levantar, **en este orden**:

```bash
$DC build                    # construye antojarte-api y antojarte-proxy (unos minutos)
$DC up -d db                 # primero solo la base: la primera vez crea los usuarios
$DC ps                       # esperá a que db diga (healthy)
$DC logs db | grep "Usuarios de base listos"
```

### 3. Migraciones, primer admin y datos de ejemplo

**Migraciones.** Nunca se aplican solas. Primero mirá cuáles faltan y **leé esos archivos** en `antua-api/src/database/migrations/`; buscá sobre todo `DROP COLUMN` o `DROP TABLE`. Después aplicalas:

```bash
$DC run --rm migrate node node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
$DC run --rm migrate          # aplica las pendientes, con el usuario de migraciones
$DC up -d                     # ahora sí: API y proxy
$DC ps                        # los tres (healthy)
```

Si levantás la API antes de migrar una base nueva, termina con este mensaje: "No se pudo comprobar el estado de las migraciones… aplicá las migraciones primero". El motivo: `antua_app` no puede crear tablas.

**Migraciones propuestas (opcionales, decisión tuya).** En `antua-api/src/database/proposed/` hay dos: índices en `orders` (Fase 13) y `products.updated_at` para el sitemap (Fase 16). **No se aplican solas**: están fuera de `migrations/`. Qué hace cada una, sus `EXPLAIN` antes y después con 200.000 pedidos, el riesgo, el bloqueo esperado, el `down`, el respaldo y los comandos exactos: [migraciones-pendientes.md](migraciones-pendientes.md).

El archivo explica qué `@Index` sumar después a la entidad.

**Primer admin.** Es la única forma de tener el rol admin. Te pide email, nombre y contraseña, y la contraseña no se ve mientras la escribís:

```bash
$DC run --rm api node dist-tools/scripts/admin-create.js
```

**Datos de ejemplo (opcional).** Para mostrar la tienda con productos:

```bash
$DC run --rm api node dist-tools/scripts/seed.js --catalog-only
$DC run --rm api node dist-tools/scripts/nutrition-examples.js --dry-run --allow-production
$DC run --rm api node dist-tools/scripts/nutrition-examples.js --yes --allow-production
```

**Por qué NO el seed completo.** El seed de desarrollo crea cuentas con una contraseña conocida (`seed.cliente@antojarte.example` / `SeedPass123!`) y cupones con códigos públicos. En un servidor que alguien más puede ver, cualquiera entraría con esas cuentas. Por eso el seed completo se niega a correr en producción, y `--catalog-only` carga solo tags y productos.

Para retirar el catálogo de ejemplo antes de abrir al público, **desactivá esos productos desde el panel**: quedan en la auditoría y se pueden reactivar. `seed:clean` no corre en producción, porque también borra los pedidos que incluyan esos productos.

#### Usuarios en una base existente

Si la base ya existía antes de esta fase (el script de inicio no corre sobre un volumen con datos), agregá a `.env.prod` las contraseñas de los usuarios nuevos y corré el mismo script a mano. Es idempotente: crea lo que falta y actualiza contraseñas y permisos.

```bash
$DC up -d db
$DC exec db sh /docker-entrypoint-initdb.d/01-create-users.sh
```

Después, la API ya usa `antua_app` (lo indica `docker-compose.prod.yml`).

### 4. HTTPS

**Modo `internal` (sin dominio público: red local o pruebas).**

```ini
HTTPS_MODE=internal
SITE_ADDRESS=antojarte.lan          # o la IP del servidor, o localhost
PUBLIC_URL=https://antojarte.lan    # con :8443 si HTTPS_PORT no es 443
PROXY_BIND=192.168.1.50             # la IP de LAN del servidor (o 127.0.0.1 para solo local)
```

- Caddy crea su propia autoridad certificadora (CA). El navegador avisa "conexión no privada" hasta que instales esa CA:

  ```bash
  $DC cp proxy:/data/caddy/pki/authorities/local/root.crt ./antojarte-ca.crt
  ```

  Llevá ese archivo a cada equipo que vaya a entrar (no lo subas al repo: `*.crt` está ignorado):
  - **Windows:** doble clic → Instalar certificado → Equipo local → "Entidades de certificación raíz de confianza".
  - **macOS:** Acceso a Llaveros → Sistema → arrastrar → "Confiar siempre".
  - **Firefox** (usa su propio almacén): Ajustes → Privacidad y seguridad → Certificados → Ver certificados → Autoridades → Importar.
  - **Android:** Ajustes → Seguridad → Cifrado y credenciales → Instalar un certificado → Certificado de CA.
- El nombre tiene que resolverse en cada equipo: una entrada en el DNS del router, o en `/etc/hosts` (`C:\Windows\System32\drivers\etc\hosts` en Windows): `192.168.1.50 antojarte.lan`.
- Limitá quién entra con el firewall, por ejemplo: `sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp`.
- Sin HSTS a propósito: si cambiás de nombre o de modo, el navegador no queda atado a este certificado.
- **Comprobarlo:**

  ```bash
  curl --cacert antojarte-ca.crt -I https://antojarte.lan
  CURL_OPTS="--cacert antojarte-ca.crt" ./scripts/check-headers.sh https://antojarte.lan
  ```

**Modo `public` (con dominio real; solo si el servidor es accesible desde internet).**

```ini
HTTPS_MODE=public
SITE_ADDRESS=tienda.tu-dominio.com
PUBLIC_URL=https://tienda.tu-dominio.com
ACME_EMAIL=tu-correo-real@dominio.com   # obligatorio en este modo; Let's Encrypt rechaza .example
PROXY_BIND=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
```

Requisitos:
- El DNS del dominio (registro `A`, y `AAAA` si tenés IPv6) apunta a la IP pública del servidor: `dig +short tienda.tu-dominio.com`.
- Los puertos **80 y 443** del router o del firewall llegan al servidor y están libres. Let's Encrypt valida por el 80 (HTTP-01) o el 443 (TLS-ALPN).
- Caddy pide y renueva el certificado solo. Si falla, `$DC logs proxy` lo explica. Tené en cuenta que Let's Encrypt limita los reintentos: no lo reinicies en bucle.
- Se activa HSTS (`max-age=31536000`, sin `preload` ni `includeSubDomains`).

Comprobarlo:

```bash
curl -I https://tienda.tu-dominio.com
./scripts/check-headers.sh https://tienda.tu-dominio.com --hsts
```

### 5. Respaldos

```bash
sudo mkdir -p /var/backups/antojarte
sudo chown antojarte: /var/backups/antojarte
sudo chmod 700 /var/backups/antojarte
```

**Probar un respaldo a mano** (como `antojarte`, desde `Antua/`):

```bash
./scripts/backup-db.sh
ls -l /var/backups/antojarte    # antua_db-AAAAMMDD-HHMMSS.sql.gz y uploads-….tar.gz, con -rw-------
```

**Respaldo diario automático (systemd).** Si clonaste en otro lugar que `/opt/antojarte`, ajustá las rutas del `.service`.

```bash
sudo cp deploy/systemd/antojarte-backup.service deploy/systemd/antojarte-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now antojarte-backup.timer
sudo systemctl start antojarte-backup.service      # una corrida ahora, para probar
systemctl status antojarte-backup.service          # "status=0/SUCCESS"
journalctl -u antojarte-backup.service -n 30
systemctl list-timers antojarte-backup.timer       # próxima corrida (03:30)
```

Alternativa con cron (`crontab -e` del usuario `antojarte`):

```cron
30 3 * * * cd /opt/antojarte/Antua && ./scripts/backup-db.sh >> /var/backups/antojarte/backup.log 2>&1
```

**Copia fuera del servidor.** Un respaldo en el mismo disco no sirve si se rompe el disco. Copialos periódicamente a otro lado, por ejemplo con `rsync` a otro equipo o a un disco externo.

**Probar una restauración, sin tocar el sitio real.** Se usa un proyecto aparte, con puertos propios: el mismo método que se probó en local.

```bash
cp .env.prod /tmp/antojarte-restore.env
sed -i -e 's/^HTTP_PORT=.*/HTTP_PORT=18080/' -e 's/^HTTPS_PORT=.*/HTTPS_PORT=18443/' \
  -e 's/^PROXY_BIND=.*/PROXY_BIND=127.0.0.1/' /tmp/antojarte-restore.env
export COMPOSE_PROJECT_NAME=antojarte-restore ENV_FILE=/tmp/antojarte-restore.env
docker compose -p antojarte-restore -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d db
./scripts/restore-db.sh /var/backups/antojarte/antua_db-…sql.gz --uploads /var/backups/antojarte/uploads-…tar.gz
#   escribí el nombre de la base para confirmar; al final muestra cuántos productos, usuarios y pedidos hay
curl -k https://127.0.0.1:18443/api/health
# Limpieza de la prueba (borra SOLO el proyecto antojarte-restore):
docker compose -p antojarte-restore -f docker-compose.prod.yml --env-file "$ENV_FILE" down -v
rm /tmp/antojarte-restore.env
unset COMPOSE_PROJECT_NAME ENV_FILE
```

**Restaurar en el sitio real** (por ejemplo, después de un error grave):

```bash
./scripts/restore-db.sh /var/backups/antojarte/antua_db-….sql.gz --force [--uploads …tar.gz]
```

Con `--force`, primero guarda el estado actual como `…-antes-de-restaurar`.

### 6. Actualizar a una versión nueva y volver atrás

```bash
cd /opt/antojarte/Antua
git fetch && git log --oneline HEAD..origin/main      # qué cambia
git diff HEAD..origin/main -- antua-api/src/database/migrations   # ¿migraciones nuevas? leelas

# 1. Respaldo previo
BACKUP_TAG=antes-de-actualizar ./scripts/backup-db.sh

# 2. Guardar las imágenes actuales para poder volver
docker tag antojarte-api:local antojarte-api:anterior
docker tag antojarte-proxy:local antojarte-proxy:anterior

# 3. Código e imágenes nuevas
git pull
$DC build

# 4. Migraciones (si hay), después de leerlas
$DC run --rm migrate node node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
$DC run --rm migrate

# 5. Reinicio con las imágenes nuevas y verificación
$DC up -d
$DC ps
curl -I https://tu-sitio/api/health
```

**Volver atrás (rollback):**

1. **Sin migraciones nuevas:**

   ```bash
   docker tag antojarte-api:anterior antojarte-api:local
   docker tag antojarte-proxy:anterior antojarte-proxy:local
   $DC up -d
   git checkout <commit-anterior>   # para que el código coincida con lo que corre
   ```

2. **Si se aplicó una migración:** el código viejo puede no entender el esquema nuevo. Lo más seguro es volver las imágenes como en el punto 1 **y restaurar el respaldo previo**:

   ```bash
   ./scripts/restore-db.sh /var/backups/antojarte/antua_db-…-antes-de-actualizar.sql.gz --force
   ```

   Se pierde lo que pasó después del respaldo: hacelo enseguida. Existe `migration:revert`, pero solo deshace bien si la migración tiene un `down()` correcto. Con datos de por medio, el respaldo es más confiable.

Otra forma de tener versiones: `IMAGE_TAG=v2` en `.env.prod` antes de `$DC build` (las imágenes quedan como `antojarte-api:v2`). Volver es cambiar `IMAGE_TAG` y `$DC up -d`.

### 7. Antes de abrir al público

- [ ] Ningún valor `EJEMPLO` en `.env.prod`. Permisos `600`. Secretos generados con `generate-secrets.sh`.
- [ ] La API arrancó con `NODE_ENV=production`, que ya fija el compose: si un secreto fuera débil, no habría arrancado.
- [ ] `SEED_ADMIN_PASSWORD` no está definida.
- [ ] Ninguna cuenta de prueba:

  ```bash
  $DC exec db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot antua_db -e "SELECT id,email,role FROM users WHERE email LIKE \"seed.%\" OR email LIKE \"%@antojarte.example\" OR email LIKE \"%@antua.test\""'
  ```

  Tiene que dar vacío (o solo cuentas que reconozcas).
- [ ] Admins: solo los que creaste con `admin:create`, con contraseñas únicas. Revisá la lista en el panel → Usuarios.
- [ ] Catálogo de ejemplo desactivado (si lo cargaste) y productos reales cargados.
- [ ] `CORS_ORIGINS` vacío (front y API en el mismo dominio).
- [ ] HTTPS válido. En modo `public`, `check-headers.sh --hsts` da "todo cumple". HSTS sin `preload`.
- [ ] Respaldos: el timer activo, una restauración probada y una copia fuera del servidor.
- [ ] Términos y Privacidad siguen marcados como **Borrador de práctica**; el contacto es de ejemplo. Si vas a recibir pedidos reales, hacen falta textos revisados y un correo real.
- [ ] Pagos: deshabilitados (`GET /api/payments/config` → `{"enabled":false}`). Los pedidos quedan "a coordinar".
- [ ] Firewall: solo los puertos del proxy abiertos; el 3306 no se expone.
- [ ] La migración de índices: decidida (aplicada o no).
- [ ] Correo: `MAIL_TRANSPORT=smtp` con tu proveedor, SPF/DKIM/DMARC configurados, y un pedido de prueba cuya confirmación llegó a la bandeja de entrada (no a spam).
- [ ] `https://tu-sitio/sitemap.xml` lista solo productos activos, y `/robots.txt` apunta a él.
- [ ] Mercado Pago sigue sin credenciales (`pnpm --filter antua-api payments:check` lo confirma). Para probarlo en modo prueba, ver [`mercadopago-prueba.md`](./mercadopago-prueba.md), nunca en el servidor público.

### 8. Operación diaria

| Para… | Comando |
|---|---|
| Ver el estado y la salud | `$DC ps` |
| Logs en vivo | `$DC logs -f api` (o `proxy`, `db`) |
| Últimos errores de la API | `$DC logs --since 1h api \| grep -i error` |
| Salud desde afuera | `curl https://tu-sitio/api/health` → `{"status":"ok","database":"up"}` |
| Reiniciar un servicio | `$DC restart api` |
| Detener todo (los datos quedan) | `$DC down`. **Nunca `down -v`**: borra los volúmenes (base, subidas, certificados) |
| Levantar todo | `$DC up -d` |
| Espacio en disco de Docker | `docker system df` |
| Entrar a MySQL | `$DC exec db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot antua_db'` |

Los logs de Docker rotan solos. Los de acceso de Caddy, en JSON, salen por `$DC logs proxy` e incluyen la IP de cada visita.

## Verificar el despliegue

Con el sitio arriba, desde un equipo con el repo (en `Antua/`):

```bash
# Cabeceras de seguridad, caché, compresión y fallback de SPA
CURL_OPTS="--cacert antojarte-ca.crt" ./scripts/check-headers.sh https://tu-sitio

# Recorridos de compra (invitado y con cuenta), panel y CSP con Playwright, contra el proxy.
# El admin es uno creado con admin:create.
# Crean datos de prueba (cuentas seed.e2e-…): NO lo corras contra el sitio público.
cd antua-web
E2E_BASE_URL=https://tu-sitio E2E_API_URL=https://tu-sitio/api E2E_IGNORE_HTTPS_ERRORS=1 \
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… pnpm test:e2e:deploy

# Correos de punta a punta (con Mailpit en un entorno de prueba como antojarte-test)
MAILPIT_URL=http://127.0.0.1:8025 E2E_BASE_URL=https://tu-sitio E2E_API_URL=https://tu-sitio/api \
E2E_IGNORE_HTTPS_ERRORS=1 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npx playwright test e2e/mail.spec.ts --project=desktop

# Lighthouse sobre el despliegue
QA_BASE_URL=https://tu-sitio QA_API_URL=https://tu-sitio/api QA_IGNORE_CERT_ERRORS=1 \
NODE_EXTRA_CA_CERTS=antojarte-ca.crt pnpm qa:lighthouse -- --run=servidor --only=home,tienda,ficha --runs=3
```

Los e2e necesitan el cupón `SEEDFIJO` del seed completo. Por eso se corren contra un entorno de prueba como `antojarte-test` (ver abajo), no contra el servidor real.

**En Windows con Git Bash** (como se probó acá):
- `MSYS_NO_PATHCONV=1`, para que Git Bash no cambie rutas como `/data`, y rutas `C:/…` en `ENV_FILE` y `COMPOSE_FILE`;
- `--ssl-no-revoke` en `CURL_OPTS`: el curl de Windows (Schannel) exige un chequeo de revocación que la CA interna no tiene;
- los permisos 600/700 no se aplican sobre NTFS.

## Actualizar las imágenes base

Están fijadas en tres lugares:

| Imagen | Dónde |
|---|---|
| `node:24.22.3-alpine3.23` | `FROM` de `antua-api/Dockerfile` (2 veces) y `antua-web/Dockerfile` |
| `caddy:2.11.9-alpine` | `FROM` de `antua-web/Dockerfile` |
| `mysql:8.4.13` | `docker-compose.prod.yml` y los servicios de `.github/workflows/ci.yml` |
| pnpm `10.34.9` | `ARG PNPM_VERSION` en los dos Dockerfiles y `PNPM_VERSION` en `ci.yml` |

Dependabot propone los cambios de imágenes cada lunes. Para hacerlo a mano:
1. Elegí la versión nueva en Docker Hub. Para MySQL, quedate en 8.4.x (LTS): un salto de versión mayor cambia el formato de los datos.
2. Cambiala en todos los lugares de la tabla.
3. `$DC build` y probalo en un proyecto aparte (como `antojarte-test`) antes de llevarlo al servidor.

Fijar por digest (`node:24.22.3-alpine3.23@sha256:…`) es todavía más estricto, a cambio de actualizarlo a mano.

## Integración continua

`.github/workflows/ci.yml` corre en cada pull request y en cada push a `main`. Ojo: **los pushes a otras ramas no la disparan.**

| Job | Qué verifica |
|---|---|
| Archivos prohibidos y secretos | `scripts/check-repo.sh`: que no haya `.env`, `node_modules`, compilados, respaldos, subidas, claves ni certificados versionados, ni secretos evidentes (tokens con formato conocido, claves privadas, `PASSWORD=` con valores reales). En un PR revisa solo las líneas nuevas |
| Front | Tipos, lint, tests unitarios y build |
| API | Tipos, lint (sin `--fix`), tests unitarios y build, incluido `dist-tools` |
| API e2e | Los 98 e2e contra un MySQL 8.4 descartable que da Actions |
| Imágenes de Docker | Construye las dos imágenes (sin publicarlas) y valida el compose con la plantilla |
| Front e2e (opcional) | Playwright con API y base reales. Solo en `main` o a mano (Actions → CI → Run workflow) |

**Seguridad del workflow:**
- `permissions: contents: read`: no puede escribir en el repo.
- Acciones fijadas por SHA: un tag se puede mover, un SHA no.
- `persist-credentials: false`.
- Solo valores de prueba (`ci-solo-pruebas`). No usa secretos de GitHub ni despliega nada.
- `concurrency` cancela las corridas viejas, y cada job tiene un tiempo máximo.

Se validó con `actionlint`, pero **nunca corrió en GitHub**: la primera corrida real va a ser en el primer PR.

**Dependabot** (`.github/dependabot.yml`) abre PRs semanales y agrupados: dependencias de npm (menores y parches juntos; las mayores, de a una), imágenes de los Dockerfiles, imágenes del compose y acciones. **Nunca mezcla solo:** cada PR pasa por la CI y lo revisás vos.

## Qué se probó en local

Windows 11 con Docker Desktop, proyecto aparte `antojarte-test`:
- puertos 8080/8443 en 127.0.0.1;
- su propio `.env` (fuera del repo) con secretos generados por el script;
- modo `internal`.

El entorno de desarrollo (`antua-mysql`, API, front y preview) no se tocó.

- **Arranque:**
  - los usuarios de base se crearon solos;
  - la API sin migrar dio el mensaje claro;
  - `migrate` aplicó las 8 migraciones;
  - los tres servicios quedaron healthy.
- **Aislamiento:**
  - la base y la API sin puertos en el host (3306 cerrado);
  - la base solo en la red `backend`;
  - `antua_app` no puede crear tablas;
  - root solo en `localhost`.
- **HTTPS interno:**
  - certificado verificado con la CA exportada (OpenSSL: `Verify return code: 0`);
  - HTTP → HTTPS manteniendo el puerto y la query.
- **Cabeceras:** `check-headers.sh` "todo cumple", con la CSP sin `unsafe-*` y la caché de `/assets` y de las subidas.
- **Playwright contra el proxy:**
  - compra de invitado, compra con cuenta (inicio de sesión desde el checkout, el pedido en Mis pedidos), cliente bloqueado en el panel y flujo completo del panel con subida de imagen;
  - sin violaciones de CSP (incluida la Home con Three.js);
  - axe (0 violaciones) y teclado: 34/34;
  - una prueba negativa confirmó que un script en línea queda bloqueado.
- **Subidas:** la imagen subida sigue igual (mismo hash) después de `restart` y de `down` + `up`.
- **Lighthouse por el proxy** (mediana de 3, móvil): Home 3D 67 (antes 60 con `vite preview`), Tienda 98 (90), Ficha 97 (89). El LCP móvil pasó de 3,1–3,3 s a 2,2–2,4 s, por zstd/gzip y HTTP/2. Accesibilidad, buenas prácticas y SEO: 100. Detalle en `docs/qa/lighthouse/proxy/`.
- **Arranques fallidos:**
  - sin `JWT_SECRET`, compose no arranca;
  - con un JWT de ejemplo, con root, con una contraseña débil o con `FRONTEND_URL` (hoy `PUBLIC_URL`) HTTP, la API no arranca y dice por qué;
  - con la base caída mientras corre, `/health` da 503, la página sigue y se recupera sola;
  - sin base al arrancar, reintenta y termina con error a los ~80 s (en compose, Docker la vuelve a levantar).
- **Prueba de restauración:**
  1. Datos: 15 productos, 8 usuarios, 6 pedidos, 25 registros de auditoría y 2 imágenes.
  2. Respaldo con `backup-db.sh`: 19 tablas, verificado.
  3. Se **borraron los volúmenes** de la base y de las subidas, y se levantó una base vacía (0 tablas).
  4. `restore-db.sh --uploads`.
  5. La foto de los datos (15 conteos por tabla, hash de usuarios y pedidos, una consulta de pedido con ítems y el hash de la imagen) quedó **idéntica** antes y después, y el admin restaurado inicia sesión.
  6. También: se niega a pisar una base con datos sin `--force`, rechaza un respaldo truncado, y `--force` hace el respaldo de seguridad previo.

  La confirmación interactiva (escribir el nombre de la base) no se pudo probar sin terminal.
- **Imágenes:** ni las capas (`docker history`) ni el contenido tienen `.env`, claves ni ninguno de los secretos de prueba.

### Fase 15 (proyecto `antojarte-f15`, 21/11/2026)

Mismo método, con Mailpit en la red interna y la API con `MAIL_TRANSPORT=smtp` en producción.
- Los correos de confirmación y de cambio de estado llegan; el HTML se ve en claro y oscuro, y un nombre con HTML no se ejecuta.
- `sitemap.xml` y `robots.txt` responden por el proxy (`check-headers.sh`).
- La exportación CSV se descarga desde el panel (e2e del panel).
- Se encontró y corrigió que el log de accesos de Caddy guardaba tokens: verificado que ya no.
- Home con poster: Lighthouse móvil 67 → 96 (ver `qa/informe-qa.md`).

## Riesgos y límites

- **SPA sin SSR:** quien no ejecuta JavaScript (vistas previas de WhatsApp o Slack) ve el título y la descripción por defecto (ver `docs/qa/informe-qa.md`).
- **Una sola máquina:** sin réplica de la base ni balanceo. Si se cae el servidor, se cae el sitio. Los respaldos son el plan de recuperación.
- **Grupo `docker`:** el usuario `antojarte` puede controlar Docker, y eso equivale a root en el servidor.
- **Caddy corre como root dentro de su contenedor** (con `cap_drop: ALL` y solo `NET_BIND_SERVICE`). La imagen oficial lo trae así.
- **Logs de acceso con IPs:** son datos personales; Docker los rota y descarta.
- **Correo:** sin un SMTP configurado (`MAIL_TRANSPORT=log`) no sale ningún correo, ni la confirmación ni la recuperación de contraseña. Con SMTP, la entregabilidad depende del dominio (SPF, DKIM y DMARC).
- **CI sin estrenar:** nunca corrió en GitHub.
- **IP real detrás del proxy:** la API confía en un salto (`TRUST_PROXY=1`) y Caddy reemplaza cualquier `X-Forwarded-For` que mande el cliente. Si ponés otro proxy o un CDN delante de Caddy, hay que ajustar `TRUST_PROXY` y los `trusted_proxies` de Caddy. Si no, el límite de intentos vería a todos con la misma IP.
