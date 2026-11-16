# Prompt: Fase 12 de Antojarte (Panel de administración)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. Las Fases 5 a 11 ya están terminadas: no las repitas. Mercado Pago queda FUERA de esta fase: no toques el módulo Payments ni el webhook (el panel solo muestra el estado de pago, en modo lectura).

## Objetivo

Un panel de administración para operar la tienda sin usar la API a mano: catálogo (productos, variantes, stock, imágenes, tags), cupones, pedidos, reseñas y un resumen con métricas. El panel vive dentro de antua-web, bajo /admin, cargado de forma diferida, y solo accesible para administradores.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre pasos. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta acá, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md, docs/estado-frontend.md y los READMEs antes de empezar.
- Todo en TypeScript estricto, sin `any`. Front y back.
- Podés modificar el backend (../antua-api). Estoy aprendiendo NestJS y TypeORM: por cada cambio de backend, explicámelo en lenguaje simple en docs/progreso.md (archivo y línea, qué faltaba, qué cambió y por qué) y dejá curl documentados.
- Antes de tocar el esquema: respaldo de la base FUERA del repo (`docker exec antua-mysql mysqldump ... > ~/respaldos/antua_db_FECHA.sql`) y usá migraciones (el esquema ya se maneja con migraciones; no uses synchronize). No borres columnas ni tablas existentes sin preguntarme.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fase-12-admin`), no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `node_modules`, respaldos, builds, subidas de imágenes ni datos de seed con claves. Nada de `--force` ni de reescribir historia. Si el push falla, no insistas en bucle: seguí commiteando localmente y avisame al final.
- Entorno: la base corre en MySQL 8 (contenedor antua-mysql) en 127.0.0.1:3307 porque el 3306 lo usa un MariaDB del sistema que NO hay que tocar. NO detengas, reinicies ni modifiques ningún servicio, contenedor o proceso que no pertenezca a este repo (en la fase anterior se detuvo uno llamado "Competika" sin avisar). Si hay un conflicto de puertos, usá otros puertos o preguntame; nunca frenes algo ajeno. Anotá esta regla en CLAUDE.md.

## Decisiones ya tomadas

- Autorización por ROLES, no por clave compartida. La clave `ADMIN_API_KEY` NUNCA puede viajar al navegador ni estar en el bundle del front. Reemplazá su uso en los endpoints de administración por un guard de rol (JWT con rol `admin`); si no hay otro uso que la justifique, retirala y documentalo.
- Nadie puede volverse admin desde la web: ni en el registro, ni en el perfil, ni desde el propio panel (el panel no gestiona roles). El primer admin se crea con un script de línea de comandos en el servidor (por ejemplo `pnpm admin:create`) que pida el email y la contraseña por prompt o por variables de entorno, nunca escritas en el código ni en el repo.
- El panel va en la misma app (rutas /admin/*, lazy-loaded, en un chunk aparte que no se descarga para clientes), sin Three.js.
- Moneda: unificá en UYU. Un único formateador en el front (Intl.NumberFormat con es-UY y UYU) usado en toda la app, incluido el panel; corregí donde hoy se muestre ARS. Confirmá que coincide con la moneda que usa el backend en los pedidos.
- Sin login de Google. Sin cambios a Payments.

## Paso 0 — Estado actual

1. `git log --oneline -n 10`, `git status` y rama actual. Creá `feat/fase-12-admin` a partir de `feat/fases-9-11` (o de `main` si esa rama ya se mezcló).
2. Verificá que base (3307), API (3000) y front (5173) respondan; levantalos si hace falta con `docker start antua-mysql` y `pnpm dev`. Si la API quedó corriendo en modo de pagos simulados, dejala así.
3. Corré typecheck, lint, build y tests de front y back. Anotá el resultado base en docs/progreso.md.
4. Mostrame un plan de 12 líneas de la Fase 12 y seguí sin esperar.

## 12.1 — Base de seguridad del panel (backend)

- Rol en usuarios (migración con respaldo previo): columna `role` con valores `customer` y `admin`, por defecto `customer`. Los usuarios existentes quedan como `customer`.
- Decorador `@Roles('admin')` y `RolesGuard`, aplicados a TODOS los endpoints de administración, que viven bajo el prefijo `/admin` (ej. `/admin/products`). Política de denegar por defecto: sin guard, no se accede.
- Que el token del cliente nunca pueda declarar su propio rol: el rol se lee de la base en cada request (o se emite firmado por el servidor), no de un campo editable.
- Auditoría: tabla `admin_audit_log` (quién, qué acción, entidad, id, fecha, resumen de cambios sin datos sensibles) escrita por cada operación de escritura del panel. Endpoint de lectura para admins.
- Script `admin:create` como se describió arriba, con validación de contraseña según la política vigente.
- Límite de intentos en login ya existe; verificá que cubra también a los admins.
- Tests de autorización para CADA endpoint /admin: sin token → 401, usuario `customer` → 403, `admin` → 200/201. Una matriz automatizada que falle si se agrega un endpoint /admin sin guard.

## 12.2 — Catálogo: productos, variantes, stock, imágenes y tags

Leé antes las entidades de Product, Variant, Image y Tag y las reglas de stock y precio existentes.

Backend (`/admin/products`, `/admin/tags`):
- Listado con búsqueda, filtros (activo/inactivo, tag, stock bajo) y paginación con tope máximo.
- Crear y editar producto: nombre, slug (único, generado y editable), descripción, ingredientes, alérgenos, información nutricional (campos opcionales), tags, activo/inactivo.
- Variantes x1/x6/x12: precio, stock, SKU único, activa/inactiva. Los precios nunca se aceptan negativos ni con más decimales de los que maneja el sistema.
- Borrado: si el producto o la variante tiene pedidos o carritos asociados, NO se borra: se desactiva. Solo se borra físicamente algo sin historial. Explicá la regla en la respuesta de la API.
- Cambios de stock con motivo (ajuste manual, reposición, merma) y registro en la auditoría.
- Imágenes: subida de archivos con multer, solo JPEG/PNG/WebP, máximo 2 MB, verificación del tipo real por contenido (no solo por la extensión o el Content-Type), nombre aleatorio generado por el servidor, almacenamiento fuera de la carpeta de código en un directorio configurable por variable de entorno (por defecto `uploads/`, incluido en .gitignore), servido de forma estática con cabeceras seguras. Orden de imágenes y una imagen principal. Borrar la imagen borra el archivo. Documentá el volumen en docker-compose para que sobreviva a los reinicios.
- Tags: crear, renombrar, activar/desactivar. Respetá los slugs que usa la Home (clasicas, sin-gluten, veganas, sin-azucar, packs): no se pueden borrar ni cambiar de slug.

Frontend (/admin/productos, /admin/productos/nuevo, /admin/productos/:id, /admin/tags):
- Tabla accesible (caption, encabezados con scope, ordenamiento si hay), con búsqueda y filtros sincronizados en la URL y paginación.
- Formulario de producto por secciones (datos, variantes, imágenes, tags) con validación en línea, foco al primer error, vista previa de la imagen, y aviso antes de salir con cambios sin guardar.
- Confirmación para toda acción destructiva y mensajes de resultado anunciados con aria-live.

## 12.3 — Cupones

Leé antes la entidad y las reglas del cupón (tipo, mínimo, límite de uso, vencimiento).
- `/admin/coupons`: listar (con usos y estado), crear, editar y activar/desactivar. Código único y normalizado (mayúsculas, sin espacios). Validá coherencia (porcentaje entre 1 y 100, fecha de fin posterior a la de inicio, límites no negativos). No se borran cupones que ya se usaron: se desactivan.
- Front: lista, formulario con validación, estados vacío/carga/error.

## 12.4 — Pedidos

- `/admin/orders`: listado con filtros (estado, estado de pago, rango de fechas, búsqueda por número o email) y paginación. Detalle con ítems (precio del snapshot), dirección, contacto, cupón, totales, estado del pago (SOLO lectura) e historial de cambios de estado.
- Cambio de estado con una máquina de estados validada en el servidor (por ejemplo pendiente → pagado → en preparación → enviado → entregado; cancelado desde los estados permitidos). Transiciones inválidas devuelven 409 con un mensaje claro. Leé primero los estados que ya existen en el código y respetalos; no los cambies sin preguntarme.
- Cancelar un pedido devuelve el stock y el uso del cupón siguiendo la lógica que ya implementó Payments/Orders para pedidos vencidos; reutilizá esa lógica y no la dupliques.
- El panel NUNCA edita precios ni totales de un pedido. Sí permite una nota interna.
- Cada cambio queda en la auditoría y en el historial del pedido.
- Front: listado y detalle con acciones de estado (con confirmación) y la nota interna.

## 12.5 — Resumen (dashboard) y métricas

- `/admin/stats` con consultas agregadas eficientes (sin traer todos los pedidos): ventas y cantidad de pedidos por período (hoy, 7 días, 30 días), pedidos pendientes de pago y de preparación, productos más vendidos, variantes con stock bajo (umbral configurable por variable de entorno), y reseñas nuevas.
- Zona horaria coherente con la corrección de UTC ya hecha: los límites de "hoy" y de cada período se calculan en America/Montevideo.
- Front: tarjetas de resumen y un gráfico simple. Preferí SVG propio y liviano; si agregás una librería de gráficos, justificá el peso en docs/progreso.md. Los gráficos deben tener alternativa textual (tabla o descripción), no depender solo del color y respetar los tokens de DESIGN.md en claro y oscuro.

## 12.6 — Reseñas y usuarios (moderación)

- Reseñas: `/admin/reviews` para listar con filtros y ocultar o borrar una reseña (preferí ocultar, reversible; que el promedio del producto se recalcule). Dejá constancia en la auditoría.
- Usuarios: `/admin/users` en modo SOLO lectura (nombre, email, fecha de alta, cantidad de pedidos, rol). Sin edición de roles ni de contraseñas. Sin exponer hashes ni tokens.

## 12.7 — Frontend: estructura y estándares del panel

- Layout propio con barra lateral (Resumen, Productos, Tags, Cupones, Pedidos, Reseñas, Usuarios, Auditoría), encabezado con el usuario y "Cerrar sesión", y un skip link. Tokens de DESIGN.md, claro y oscuro, voseo.
- Acceso: rutas protegidas por rol. Sin sesión, abrir el AuthModal y volver a la ruta; con sesión de `customer`, mostrar una página "No tenés permiso" (403). El enlace "Administración" aparece en el menú de cuenta SOLO para admins. No indexar /admin (meta robots noindex).
- La verificación en el front es solo comodidad: la seguridad real está en el backend.
- Componentes reutilizables: DataTable accesible, Pagination, ConfirmDialog, FormField, StatusBadge, EmptyState, Toast con aria-live. Reutilizá Button, Drawer, ErrorState, etc., que ya existen.
- Responsive: pensado para escritorio, pero usable desde 768 px y sin romperse a 375 px (las tablas con scroll horizontal dentro de una región con etiqueta, o transformadas en tarjetas).
- Todo con teclado, foco visible, prefers-reduced-motion respetado, Intl para fechas y moneda.

## Fase de cierre

- Tests: unitarios de los servicios nuevos (reglas de borrado, máquina de estados, estadísticas), matriz de autorización de /admin, y un spec e2e de Playwright del flujo de admin (crear admin de prueba por script, login, crear producto con variantes e imagen, crear cupón, cambiar el estado de un pedido, ver el resumen) y de que un `customer` no puede entrar.
- Seed: ampliá el seed seguro del repo con un admin de prueba SOLO para desarrollo, con contraseña tomada de una variable de entorno (no escrita en el código) y su limpieza.
- docs/admin.md: modelo de roles, cómo crear el primer admin, estructura de /admin, endpoints y la máquina de estados de pedidos. Actualizá README, docs/estado-frontend.md, docs/progreso.md, CLAUDE.md y .env.example (nuevas variables: directorio de subidas, umbral de stock bajo, etc.).
- Revisá .gitignore y confirmá con `git ls-files` que no hay `.env`, `node_modules`, respaldos ni subidas versionados.

## Check final (después de cada subfase y al terminar)

1. Front: typecheck, lint, build y tests. Back: build, tests unitarios y e2e. Sin errores ni warnings nuevos. Mostrá el tamaño del chunk de /admin y verificá que NO se descargue en la Home, la Tienda ni el Checkout.
2. Con playwright-cli recorré el panel completo en 1280 px y 768 px (y verificá que a 375 px no se rompa), claro y oscuro, como admin. Probá también el acceso como `customer` y sin sesión. Guardá capturas en docs/checks/.
3. /web-interface-guidelines sobre los archivos nuevos o modificados de src/ y corregí lo que marque.
4. Verificá DESIGN.md: tokens, radios, sin hex sueltos, ningún `transition: all`, ningún `outline-none` sin reemplazo, voseo.
5. Revisión de seguridad: guard de roles en cada endpoint /admin, validación y whitelist en cada DTO (sin asignación masiva), subida de archivos, ningún secreto ni dato personal innecesario en respuestas y logs, ownership en lo que corresponda.
6. Reporte final de máximo 12 líneas: qué quedó terminado, qué quedó pendiente, qué necesita una decisión mía y qué comandos debo correr yo (migraciones, crear el primer admin). Si algún push falló, decímelo con los hashes de los commits locales.
