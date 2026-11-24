# Prompt: Fase 16 de Antojarte (Revisión de seguridad, observabilidad, migraciones pendientes y presentación del repositorio)

Este archivo ES el pedido nuevo. Las Fases 5 a 15 ya están terminadas y en `main`: no las repitas. NO llames a Mercado Pago real (no hay credenciales).

## Regla de idempotencia (importante)

Antes de CADA subfase, verificá en el repositorio si ya está hecha (código, docs, commits). Si ya lo está, marcala como hecha en docs/progreso.md y pasá a la siguiente SIN duplicar trabajo ni commits. Si está a medias, completala. Nunca reescribas trabajo ya subido sin que yo lo confirme.

## Objetivo

Dejar el proyecto sólido y presentable: una revisión de seguridad real con evidencia, logs y errores de producción sanos, las migraciones pendientes explicadas para que yo las apruebe, y un repositorio que cualquier persona pueda entender, correr y evaluar en pocos minutos.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre pasos. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta acá, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md, docs/estado-frontend.md, docs/qa/, docs/despliegue.md y docs/payments-design.md antes de empezar.
- Todo en TypeScript estricto, sin `any`. Front y back.
- Estoy aprendiendo: por cada cambio de backend o de infraestructura, explicámelo en lenguaje simple en docs/progreso.md (archivo y línea, qué faltaba, qué cambió y por qué).
- Antes de tocar datos o esquema: respaldo de la base FUERA del repo. NUNCA apliques una migración, propuesta o generada, sin que yo la haya leído y aprobado por escrito. Las migraciones nuevas se dejan en database/proposed/.
- Mi entorno de desarrollo está corriendo (contenedor `antua-mysql` en 127.0.0.1:3307, API en :3000, front en :5173). NO lo detengas ni lo reinicies sin avisarme. Las pruebas destructivas van en una base y un proyecto de Compose aparte, con puertos distintos; borrá solo lo que creaste.
- NO detengas, reinicies ni modifiques ningún servicio, contenedor o proceso que no pertenezca a este repo.
- No ejecutes nada contra servidores remotos ni abras túneles. Las herramientas de escaneo se usan localmente y, si necesitan descargar algo, decime qué y de dónde antes.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fase-16-seguridad-presentacion`), creada a partir de `main` actualizado, no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `.env.prod`, claves, certificados, respaldos, `node_modules`, builds, uploads ni videos o capturas pesadas fuera de `docs/`. Nada de `--force` ni de reescribir historia. Si el push falla, no insistas en bucle: seguí commiteando localmente y avisame al final.
- Decisiones ya tomadas: moneda UYU; sin Google login; marca visible "Antojarte"; correo de ejemplo contacto@antojarte.example; migraciones explícitas; los correos de prueba del seed pasan de `@antua.test` a `@antojarte.example`.

## Paso 0 — Estado actual

1. `git fetch --all`, confirmá que `main` incluye la Fase 15 (si no, avisame y pará). Creá `feat/fase-16-seguridad-presentacion` desde `main`.
2. Verificá que base, API y front respondan. Corré typecheck, lint, build y tests de front y back (incluidos e2e). Anotá el resultado base en docs/progreso.md.
3. Mostrame un plan de 12 líneas y seguí sin esperar.

## 16.1 — Migraciones pendientes (solo preparar, NO aplicar)

- Seed: cambiá los correos de prueba a `@antojarte.example` (y su limpieza), con tests.
- `updated_at` en productos: dejá una migración propuesta en database/proposed/ (con `up` y `down`) que agregue la columna con valor por defecto sensato, y hacé que el sitemap la use cuando exista y degrade con gracia (sin `lastmod`) cuando no. Probala solo en una base de prueba aparte.
- Escribí docs/migraciones-pendientes.md: para CADA migración propuesta (índices, `updated_at`, otras que existan) explicá qué hace, por qué se pide, qué evidencia hay (para los índices, los `EXPLAIN` antes y después medidos en una base de prueba con datos de volumen razonable), el riesgo, el bloqueo de tablas esperado, el `down`, el respaldo previo y el comando exacto para aplicarla. Yo las leo y las aplico.

## 16.2 — Revisión de seguridad con evidencia

Hacé una revisión de seguridad ordenada y dejá los resultados en docs/seguridad.md (alcance, método, hallazgos con severidad, evidencia, estado: corregido, aceptado o pendiente de decisión). No es un simple recorrido: cada afirmación debe tener una prueba (un test, una request o una salida de herramienta).

**Dependencias y supply chain**
- `pnpm audit` del front y del back, con triage de cada hallazgo (explotable en este uso o no). Actualizá lo que se pueda de forma segura; documentá lo demás.
- Revisá que los workflows de GitHub Actions usen permisos mínimos y acciones fijadas por versión; que Dependabot esté activo.
- Escaneo de secretos sobre el historial de Git (con una herramienta local o patrones con `git log -p` filtrado; si necesitás descargar una herramienta, decime cuál antes). Si encontrás un secreto real en el historial, NO lo reescribas: avisame con detalle para decidir (rotarlo es lo primero).
- Resumen de licencias de dependencias (herramienta local) en docs/creditos.md, con las fuentes (Google Fonts), los íconos (Lucide), Three.js y GSAP (revisá la licencia vigente de GSAP y señalá cualquier condición de uso).

**Autenticación y sesiones**
- Pruebas automatizadas para: vencimiento del JWT, token manipulado o con firma inválida, usuario eliminado o desactivado con token vigente, cierre de sesión, reutilización y vencimiento de los tokens de recuperación de contraseña y de acceso a pedidos de invitado, y fijación de rol (que un cliente no pueda elevar su rol).
- Enumeración de cuentas: login, registro y recuperación deben responder igual (mensaje y tiempos razonablemente parecidos) exista o no el email. Si el registro revela que el email existe, documentá la decisión y la mitigación.
- Límite de intentos: comprobá que funcione detrás del proxy con la IP real y que no se pueda esquivar con cabeceras falsificadas.
- Almacenamiento del token en el navegador: hoy está en localStorage. Documentá el riesgo (XSS) y las mitigaciones activas (CSP sin `unsafe-*`, ningún `dangerouslySetInnerHTML`; verificalo con una búsqueda en el código) y la alternativa de cookie httpOnly con su costo. No lo cambies sin mi OK.

**Autorización (lo más importante)**
- Una matriz automatizada de IDOR: para CADA endpoint que recibe un id (pedidos, direcciones, reseñas, carrito, perfil, imágenes), probá con un usuario A accediendo a recursos del usuario B (debe dar 403 o 404 según la política) y sin sesión (401). La matriz debe fallar si se agrega un endpoint con id sin test.
- Verificá que ningún endpoint devuelva campos de más (hashes, tokens, emails ajenos, notas internas): comparalos contra una lista de campos permitidos.

**Entradas y subidas**
- Inyección: probá los parámetros de orden y filtro con valores maliciosos (los campos de orden deben estar en lista blanca), asignación masiva en todos los DTO (`whitelist` y `forbidNonWhitelisted`), números negativos o desbordados, cadenas enormes y tipos incorrectos.
- Subida de imágenes: archivo con extensión falsa, tamaño excedido, nombre con rutas (`../`), imágenes con contenido de otro tipo, y SVG (si se acepta, que no pueda ejecutar scripts; si no, que se rechace).
- XSS almacenado: reseñas, nombres, direcciones y notas con HTML y scripts, comprobando cómo se muestran en el sitio, en el panel y en los correos.
- Exportaciones CSV: inyección de fórmulas con valores de prueba.

**Configuración**
- Cabeceras, CORS y CSP contra el proxy de producción de prueba (proyecto de Compose aparte). El proceso de la API corre sin root; la base no es accesible desde el host; el usuario de aplicación no puede alterar el esquema (probalo con una consulta DDL que deba fallar).
- Errores: en `NODE_ENV=production` ninguna respuesta debe filtrar stack traces, rutas internas ni mensajes de base de datos.

**Cierre de la revisión**
- Corregí lo que sea claro y de bajo riesgo. Lo que exija una decisión mía o un cambio grande (por ejemplo, cookie httpOnly o verificación de email), listalo con una recomendación y no lo implementes.
- Incluí una sección "Lo que NO se cubrió" (por ejemplo, pruebas de penetración reales, revisión de la infraestructura del servidor, el flujo real de Mercado Pago) para no dar una falsa sensación de seguridad.

## 16.3 — Observabilidad básica

- Logs estructurados en JSON en producción (y legibles en desarrollo), con un identificador de petición que se propague y se devuelva en una cabecera, y redacción de datos personales y secretos (contraseñas, tokens, cabeceras de autorización, emails completos).
- Filtro global de excepciones: en producción devuelve un mensaje genérico con el identificador de la petición; el detalle queda solo en el log.
- `/health` distingue "vivo" de "listo" (base de datos accesible) sin exponer información interna.
- Un script `scripts/check-health.sh` que consulte la salud y devuelva un código de salida útil para un monitor externo o un cron. Documentalo en docs/despliegue.md.
- Tests de lo anterior.

## 16.4 — Datos de demostración

- `pnpm seed:demo` (y su limpieza): un catálogo de demostración coherente con las seis categorías, variantes x1/x6/x12, tags, reseñas, un cupón de ejemplo y un usuario de demostración, con contraseñas tomadas de variables de entorno (nunca escritas en el código). Idempotente, y con una protección que se niegue a correr con `NODE_ENV=production`.
- Imágenes de producto: generá ILUSTRACIONES PROPIAS (SVG o imágenes simples generadas por script, con la paleta de DESIGN.md) para que cada producto tenga imagen. No uses fotos ni material con derechos de autor. Guardalas en el repo, optimizadas.
- Todo con los textos y datos de EJEMPLO ya marcados como tales.

## 16.5 — Presentación del repositorio

- README principal en español y README.en.md en inglés, claros y honestos, con: qué es el proyecto, capturas reales (de la Home, la Tienda, la Ficha, el carrito, el checkout, el panel y el modo oscuro, generadas con Playwright en 1280 px y guardadas en docs/media/, optimizadas), un diagrama de arquitectura y un diagrama entidad-relación (en Mermaid, el segundo generado a partir de las entidades reales), el stack, cómo correrlo en pocos comandos (con Docker Compose de desarrollo y datos de demostración), cómo correr los tests, la tabla de resultados de QA (Lighthouse y axe), un resumen de seguridad con enlace a docs/seguridad.md, y una sección "Limitaciones conocidas" (pagos en modo simulado, textos de ejemplo, marca ficticia, sin SSR, sin verificación de email).
- docs/decisiones.md: registros breves de las decisiones técnicas principales con el contexto, la alternativa descartada y el porqué (NestJS + TypeORM + MySQL, snapshots de precio, token de invitado, transacciones y bloqueos de stock, roles, CSP y Caddy, migraciones explícitas, pagos con Checkout Pro).
- Opcional si es sencillo: un video corto o GIF del flujo de compra grabado con Playwright (guardalo en docs/media/ solo si pesa menos de 5 MB; si no, no lo subas y avisame).
- LICENSE: NO agregues ninguna licencia: la elijo yo. Dejá una nota en el reporte con las opciones habituales y qué implica no tener ninguna.
- Revisá que ningún archivo del repo contenga datos personales míos, rutas de mi computadora, nombres de usuario de Windows o secretos. Buscalos explícitamente y limpialos o avisame.

## Check final (después de cada subfase y al terminar)

1. Front y back: typecheck, lint, build y tests (incluidos e2e de la API y Playwright), sin errores ni warnings nuevos.
2. Que `docs/seguridad.md` refleje solo lo que realmente se probó, con las pruebas ubicables en el repo, y que los tests de seguridad nuevos pasen y se ejecuten en la CI.
3. Probá en un entorno limpio, con una base y un Compose de prueba aparte, que alguien que clone el repo pueda seguir el README al pie de la letra y llegar a una tienda funcionando con los datos de demostración. Si algún paso falla, arreglá el README o el código.
4. `/web-interface-guidelines` con el comando real sobre los archivos de src/ que hayas tocado.
5. `git ls-files`: sin `.env`, `.env.prod`, `node_modules`, respaldos, uploads, ni archivos grandes innecesarios. Verificá que el tamaño del repositorio sea razonable.
6. Dejá mi entorno de desarrollo corriendo como lo encontraste y apagá y borrá solo lo que creaste.

## Reporte final

Máximo 12 líneas: qué quedó terminado, los hallazgos de seguridad por severidad y su estado, qué quedó pendiente, qué necesita una decisión mía (migraciones, licencia, cookie httpOnly, verificación de email), qué comandos debo correr yo y qué debo probar yo. Si algún push falló, decímelo con los hashes de los commits locales.
