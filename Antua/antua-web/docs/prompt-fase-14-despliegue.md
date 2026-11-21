# Prompt: Fase 14 de Antojarte (Despliegue de prueba, respaldos y CI)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. Las Fases 5 a 13 ya están terminadas: no las repitas. Mercado Pago queda fuera: no toques el módulo Payments ni el webhook.

## Objetivo

Dejar el proyecto listo para correr como un servicio estable en un servidor Linux (srv-proyecto) con Docker Compose: front estático, API, base de datos privada, HTTPS, respaldos automáticos con prueba de restauración, y una integración continua en GitHub que verifique cada cambio. Todo se construye y se prueba LOCALMENTE (esta máquina es Windows con Docker Desktop). La puesta en marcha real en el servidor la hago yo siguiendo una guía paso a paso que vos escribís.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre pasos. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta acá, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md, docs/estado-frontend.md, los READMEs y docs/qa/informe-qa.md antes de empezar.
- Todo en TypeScript estricto, sin `any`. Los scripts de shell deben ser POSIX/bash simples y comentados.
- Estoy aprendiendo: por cada pieza de infraestructura (Dockerfile, compose, proxy, respaldos, CI), explicá en docs/despliegue.md qué hace cada parte y por qué, en lenguaje simple.
- No ejecutes NADA contra servidores remotos ni te conectes por SSH. No abras puertos ni túneles hacia internet. Todo lo que pruebes es local y con puertos distintos de los de desarrollo.
- No toques mi entorno de desarrollo: el contenedor `antua-mysql` (127.0.0.1:3307), su volumen, la API (:3000), el front (:5173) y el preview (:4173) quedan como están. Para las pruebas de esta fase usá un proyecto de Compose aparte (`-p antojarte-test`), nombres de contenedores, redes y volúmenes propios, y puertos libres (por ejemplo 8080 y 8443). Al terminar, dejá todo lo de prueba apagado y borrá SOLO lo que creaste vos (contenedores, redes y volúmenes del proyecto `antojarte-test`), con comandos explícitos y avisándome.
- NO detengas, reinicies ni modifiques ningún servicio, contenedor o proceso que no pertenezca a este repo. En el servidor hay un MariaDB en el puerto 3306 que no se toca, y otros servicios ajenos al proyecto. Todos los puertos expuestos deben ser configurables por variable de entorno.
- Antes de tocar datos o esquema: respaldo de la base FUERA del repo. NUNCA apliques una migración generada sin que yo la haya leído. No ejecutes automáticamente la migración propuesta de índices (database/proposed/): incluila en la guía como paso opcional que decido yo.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fase-14-despliegue`), no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, claves, certificados, respaldos, `node_modules`, builds ni subidas. Nada de `--force` ni de reescribir historia. Si el push falla, no insistas en bucle: seguí commiteando localmente y avisame al final.
- Decisiones ya tomadas: moneda UYU; sin Google login; marca visible "Antojarte" (no "Antua"); correo de ejemplo contacto@antojarte.example; las migraciones se ejecutan de forma explícita, no al arrancar la API.

## Paso 0 — Estado actual

1. `git log --oneline -n 10`, `git status` y rama actual. Creá `feat/fase-14-despliegue` a partir de `feat/fase-13-contenido-qa` (o de `main` si ya se mezcló).
2. Revisá lo que ya existe: docker-compose.yml, README, .env.example, scripts de seed y de nutrición, /health, y cómo la API lee su configuración.
3. Corré typecheck, lint, build y tests de front y back. Anotá el resultado base en docs/progreso.md.
4. Mostrame un plan de 12 líneas de la Fase 14 y seguí sin esperar.

## 14.1 — Normalización para Windows y Linux

- Agregá un `.gitattributes` que fuerce finales de línea LF en scripts de shell, Dockerfiles, YAML y archivos de configuración (`* text=auto` y reglas `eol=lf` específicas). Un script `.sh` con CRLF falla dentro de un contenedor Linux: verificá que ninguno lo tenga, y renormalizá lo necesario sin reescribir historia.
- Los scripts ejecutables deben tener el bit de ejecución registrado en Git (`git update-index --chmod=+x`).

## 14.2 — Imágenes de producción (Docker)

- `antua-api/Dockerfile` multi-etapa: dependencias, build y una imagen final mínima solo con lo necesario para correr (sin devDependencies ni código fuente que no haga falta). Usuario NO root, `NODE_ENV=production`, versión de Node fijada, `HEALTHCHECK` contra /health, sin secretos dentro de la imagen.
- `antua-web/Dockerfile` multi-etapa: construye el front y sirve los archivos estáticos con el proxy (ver 14.3). La URL de la API en el front debe poder definirse en el build (`VITE_API_URL`) y documentarse; preferí una ruta relativa (`/api`) servida por el mismo dominio para evitar problemas de CORS.
- `.dockerignore` en cada paquete (excluir `node_modules`, `.env`, respaldos, uploads, reportes de QA, `.git`).
- Fijá versiones de las imágenes base (nada de `latest`) y anotá cómo actualizarlas.

## 14.3 — Docker Compose de producción y HTTPS

- `docker-compose.prod.yml` (aparte del de desarrollo) con tres servicios: `db` (MySQL 8), `api` y `proxy` (Caddy, que sirve el front estático, reenvía `/api` a la API y gestiona HTTPS). Redes internas: la base de datos NO publica ningún puerto al host; solo el proxy publica puertos, configurables por variable de entorno (por defecto, enlazados a 127.0.0.1).
- La API debe confiar en el proxy (`trust proxy`) para que el límite de intentos use la IP real del cliente, y debe tener CORS restringido por variable de entorno.
- HTTPS: dos modos documentados. (a) Sin dominio público: certificado interno de Caddy (`tls internal`) para pruebas en la red local o con un nombre de host local, explicando cómo confiar en la CA en el navegador. (b) Con un dominio real: variable `SITE_ADDRESS` con el dominio y Let's Encrypt automático (solo si el servidor es accesible desde internet; explicá los requisitos de puertos 80/443 y DNS). No actives HSTS con preload; activá HSTS solo en el modo con dominio real.
- Cabeceras de seguridad en el proxy: `Content-Security-Policy` compatible con la app (probala: Three.js, GSAP, fuentes e imágenes deben seguir funcionando; si la CSP exige `unsafe-inline` o `unsafe-eval` en algún punto, documentá por qué), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `X-Frame-Options` o `frame-ancestors`. Compresión (gzip/zstd) y caché larga e inmutable para los archivos con hash de Vite y para las imágenes subidas; sin caché para `index.html`. Fallback de SPA (todas las rutas del front devuelven `index.html`, excepto `/api`, los archivos estáticos y `/uploads`).
- Volúmenes con nombre para la base, las subidas (`UPLOADS_DIR`) y los datos de Caddy. Rotación de logs (`json-file` con `max-size` y `max-file`). `restart: unless-stopped`, `healthcheck` en cada servicio y `depends_on` con condición de salud. Límites razonables de memoria.
- Proyecto de Compose con nombre fijo (`name: antojarte`) y nombres de contenedores sin colisiones con los de desarrollo.

## 14.4 — Base de datos y secretos

- Usuarios de base separados y con el mínimo privilegio: un usuario de aplicación con permisos solo de datos sobre `antua_db` (SELECT, INSERT, UPDATE, DELETE) y otro usuario de migraciones con permisos de esquema, usado solo al correr `migration:run`. La API en producción NUNCA usa root. Dejá el script de inicialización de estos usuarios (se ejecuta solo en una base nueva) y una guía para crearlos en una base ya existente.
- Secretos: `.env.prod.example` con TODAS las variables y valores de ejemplo falsos (JWT, claves, contraseñas de base de datos, URLs, `SITE_ADDRESS`, puertos, límites). Un script `scripts/generate-secrets.sh` que genere valores aleatorios fuertes con `openssl rand` y los muestre para copiar a mano (no los escribe en el repo ni los registra en logs). El archivo `.env.prod` real está en `.gitignore`.
- Validación: la API debe fallar al arrancar con un mensaje claro si faltan variables obligatorias o si algún secreto es de ejemplo/débil en `NODE_ENV=production` (por ejemplo, el JWT igual al de ejemplo).
- Migraciones: servicio puntual o comando documentado (`docker compose run --rm api node dist/... migration:run` o equivalente) que se ejecuta A MANO, nunca al arrancar. Crear el primer admin: comando documentado (`admin:create`) que pida los datos de forma interactiva.

## 14.5 — Respaldos y restauración

- `scripts/backup-db.sh`: vuelca la base con `mysqldump` desde el contenedor (`--single-transaction`, `--routines`, sin exponer la contraseña en la lista de procesos, por ejemplo con un archivo de opciones o variable de entorno del contenedor), la comprime con gzip, la guarda en un directorio FUERA del repo configurable (`BACKUP_DIR`), con fecha en el nombre, retención configurable (por defecto 14 días) y permisos restrictivos (solo el dueño). También respaldá el volumen de subidas (tar comprimido).
- `scripts/restore-db.sh`: restaura un respaldo con confirmación explícita, rechazando restaurar sobre una base con datos salvo que se indique `--force`, y con una advertencia clara.
- Automatización: ejemplo de `systemd timer` (o cron) diario con un servicio de oneshot, y verificación de que el respaldo no esté vacío ni truncado.
- PRUEBA DE RESTAURACIÓN: demostrá localmente, sobre el proyecto `antojarte-test`, el ciclo completo: crear datos de prueba, respaldar, destruir la base de prueba, restaurar y verificar que los datos vuelven (conteos y una consulta de ejemplo). Documentá el resultado. Un respaldo que nunca se probó no cuenta.

## 14.6 — Integración continua (GitHub Actions)

- `.github/workflows/ci.yml` que se ejecute en pull requests y en pushes a `main`, con jobs separados para front y back: instalar con caché de pnpm, typecheck, lint, tests unitarios y build. Un job de tests e2e de la API contra un servicio MySQL de Actions. Un job opcional (manual o en `main`) para el e2e del front con Playwright.
- Permisos mínimos del workflow (`permissions: contents: read`), acciones fijadas por versión (idealmente por SHA), sin secretos reales (usá variables de prueba), `concurrency` para cancelar corridas viejas y tiempos máximos.
- Un job que verifique que no se hayan versionado archivos prohibidos (`.env`, `node_modules`, respaldos, uploads) y que no haya secretos evidentes en el diff.
- Dependabot (`.github/dependabot.yml`) para npm y para las imágenes de Docker, semanal y agrupado, sin merges automáticos.
- NO agregues despliegue automático ni secretos de producción a GitHub. El despliegue sigue siendo manual.

## 14.7 — Guía de despliegue

Escribí docs/despliegue.md, paso a paso, para que yo lo ejecute en srv-proyecto:
1. Requisitos del servidor (Docker, Compose, puertos libres, espacio) y cómo verificar que el puerto elegido no choque con MariaDB (3306) ni con otros servicios.
2. Cómo obtener el código, generar los secretos, crear `.env.prod`, construir y levantar.
3. Migraciones, creación del primer admin y carga opcional de datos de ejemplo (y por qué NO cargar el seed de pruebas con credenciales en un servidor expuesto).
4. HTTPS en cada modo y cómo comprobarlo.
5. Respaldos: instalar el timer, probar un respaldo, probar una restauración.
6. Actualizar a una versión nueva (pull, build, backup previo, migraciones, reinicio) y cómo volver atrás (rollback).
7. Operación: ver logs, estado de salud, reiniciar, y una lista de verificación "antes de abrir al público" (contraseñas, admin, CORS, HSTS, respaldos, `ADMIN`s de prueba eliminados, textos legales de ejemplo marcados como borrador).
8. Una advertencia explícita sobre exponer el sitio a internet: es un proyecto de práctica; los pagos reales no están conectados, los textos legales son borradores y conviene mantenerlo en red local o con acceso restringido hasta decidir lo contrario.

## Check final (después de cada subfase y al terminar)

1. Front y back: typecheck, lint, build y tests, sin errores ni warnings nuevos.
2. Con el proyecto `antojarte-test`: levantá todo con `docker compose -f docker-compose.prod.yml`, verificá los healthchecks, que la base NO sea accesible desde el host, que el front y la API respondan por el proxy, que HTTPS funcione en modo interno, y repetí el recorrido de compra de punta a punta con Playwright (invitado y con cuenta) y el del panel de administración, contra ese entorno. Verificá subida de imágenes y que sobrevivan a un reinicio de contenedores.
3. Medí las cabeceras de seguridad con un script (`curl -I`) y la CSP sin errores en la consola del navegador (Playwright). Ejecutá Lighthouse sobre la Home servida por el proxy y compará con el informe anterior.
4. Probá el arranque fallido: sin variables obligatorias, con secretos de ejemplo y con la base caída (la API debe reintentar o fallar con un mensaje claro).
5. Verificá con `git ls-files` que no hay `.env`, `.env.prod`, claves, certificados, respaldos, `node_modules` ni uploads versionados. Revisá que ninguna imagen contenga secretos (`docker history` y un recorrido del contenido).
6. Ejecutá `/web-interface-guidelines` sobre los archivos nuevos o modificados de src/ (si hubo cambios de front); si el comando no está disponible, decímelo explícitamente.
7. Apagá y limpiá SOLO lo que creaste para las pruebas, y confirmá que mi entorno de desarrollo sigue como estaba.
8. Actualizá README, docs/estado-frontend.md, docs/progreso.md, CLAUDE.md y .env.example.

## Reporte final

Máximo 12 líneas: qué quedó terminado, el resultado de la prueba de restauración, qué quedó pendiente, qué necesita una decisión mía (dominio, modo de HTTPS, si abrir o no a internet, la migración de índices), qué comandos debo correr yo en el servidor y qué riesgos quedan. Si algún push falló, decímelo con los hashes de los commits locales.
