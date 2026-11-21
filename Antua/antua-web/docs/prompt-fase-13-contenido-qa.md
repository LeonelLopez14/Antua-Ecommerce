# Prompt: Fase 13 de Antojarte (Contenido real y control de calidad)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. Las Fases 5 a 12 ya están terminadas: no las repitas. Mercado Pago queda fuera: no toques el módulo Payments ni el webhook.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre pasos. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta acá, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md, docs/estado-frontend.md y docs/contenido-sitio.md antes de empezar.
- Todo en TypeScript estricto, sin `any`. Front y back.
- Podés modificar el backend (../antua-api) si un hallazgo de calidad lo exige. Estoy aprendiendo NestJS y TypeORM: por cada cambio de backend, explicámelo en lenguaje simple en docs/progreso.md (archivo y línea, qué faltaba, qué cambió y por qué).
- Antes de tocar datos o esquema: respaldo de la base FUERA del repo (`docker exec antua-mysql mysqldump ... > ~/respaldos/antua_db_FECHA.sql`). NUNCA apliques una migración generada sin que yo la haya leído (en la fase anterior una migración generada se ejecutó sola y vació ingredientes y alérgenos). Cualquier cambio de datos va en un script reversible.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fase-13-contenido-qa`), no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `node_modules`, respaldos, builds, subidas de imágenes, reportes HTML pesados ni datos de seed con claves. Nada de `--force` ni de reescribir historia. Si el push falla, no insistas en bucle: seguí commiteando localmente y avisame al final.
- Entorno: la base corre en MySQL 8 (contenedor antua-mysql) en 127.0.0.1:3307 porque el 3306 lo usa un MariaDB del sistema que NO hay que tocar. NO detengas, reinicies ni modifiques ningún servicio, contenedor o proceso que no pertenezca a este repo. Si hay un conflicto de puertos, usá otros o preguntame.
- Decisiones ya tomadas: moneda UYU; sin Google login; el email de contacto de ejemplo es contacto@antojarte.example (dominio reservado, no lo cambies por uno real).

## Paso 0 — Estado actual

1. `git log --oneline -n 10`, `git status` y rama actual. Creá `feat/fase-13-contenido-qa` a partir de `feat/fase-12-admin` (o de `main` si ya se mezcló).
2. Verificá base (3307), API (3000) y front (5173); levantalos si hace falta (`docker start antua-mysql`, `pnpm dev`).
3. Corré typecheck, lint, build y tests de front y back. Anotá el resultado base en docs/progreso.md.
4. Migraciones: desactivá la ejecución automática al arrancar la API (`migrationsRun` en false) y dejá `migration:run` como paso explícito y documentado en el README y en CLAUDE.md. Explicame el motivo en lenguaje simple.
5. Verificá que exista `antua-web/.claude/commands/web-interface-guidelines.md` y, si el comando no está disponible en esta sesión, decímelo (la revisión anterior fue manual y quiero que se haga con el comando real).
6. Mostrame un plan de 12 líneas de la Fase 13 y seguí sin esperar.

## 13.1 — Contenido de las páginas

Fuente: docs/contenido-sitio.md.

- Integrá los textos de Nosotros, Preguntas frecuentes, Contacto, Términos y condiciones y Política de privacidad en sus rutas (`/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/terminos`, `/privacidad`), con `document.title` y meta description del archivo. Reemplazá los textos provisorios y sacá las marcas de "provisorio" SOLO de lo que quede integrado.
- Verificá cada afirmación contra la app real (costo y plazo de envío, métodos de pago actuales, qué datos se guardan y dónde, almacenamiento local, cookies). Usá la variante de pagos que corresponda al estado actual. Si algo del texto no coincide con el comportamiento real, adaptá el texto y anotalo en docs/progreso.md.
- Preguntas frecuentes: acordeón accesible (teclado, `aria-expanded` o `<details>`), con encabezados jerárquicos. Términos y Privacidad: mantené visible el aviso de "Borrador de práctica", con tabla de contenido con anclas (con `scroll-margin-top` en los encabezados) y la fecha de última actualización real.
- Contacto: solo datos de contacto (sin formulario, no hay endpoint).
- Footer y Navbar: enlazá las cinco páginas. Agregá una nota discreta en el footer: "Antojarte es una marca ficticia creada para un proyecto de práctica."
- Reemplazá cualquier correo de contacto que aparezca en el sitio por contacto@antojarte.example y quitá el `.com.ar`.
- Información nutricional: cargá los valores de EJEMPLO de la sección 6 de docs/contenido-sitio.md en los productos existentes, completando SOLO campos vacíos y sin sobrescribir ingredientes ni alérgenos ya cargados. Hacelo con un script reversible (con respaldo previo, un comando de deshacer y registro en la auditoría si aplica). En la Ficha, mostrá la nota "Información nutricional de ejemplo (proyecto de práctica). No corresponde a un producto real." junto a la tabla, en vez del texto "Pronto…".
- Todo con tokens de DESIGN.md, claro y oscuro, voseo y las reglas de la sección 11 de DESIGN.md.

## 13.2 — Control de calidad con herramientas reales

Generá primero un build de producción y servilo con `vite preview` (no midas el servidor de desarrollo). Dejá la API con datos de prueba y pagos simulados.

**Lighthouse.** Instalalo como dependencia de desarrollo o usá `npx`, apuntando al Chromium disponible (si hace falta, definí CHROME_PATH). Medí en móvil y escritorio estas páginas: Home, Tienda, Ficha, Checkout (con ítems en el carrito), una página institucional, el 404 y, con sesión iniciada, Mis pedidos. El panel /admin se mide aparte, solo accesibilidad y buenas prácticas. Guardá un resumen en docs/qa/lighthouse-resumen.md (puntajes de Rendimiento, Accesibilidad, Buenas prácticas y SEO, más LCP, CLS y TBT) y los reportes JSON en docs/qa/ (no subas los HTML pesados). Objetivos orientativos: Accesibilidad ≥ 95 y SEO ≥ 90 en todas; Rendimiento móvil ≥ 85 en las páginas sin 3D. La Home con 3D puede quedar más baja: documentá su LCP y TBT y qué se hizo para mejorarlos. Los puntajes son un indicador, no el objetivo: arreglá los problemas reales y no hagas trampas para subir el número.

**axe-core.** Agregá `@axe-core/playwright` como dependencia de desarrollo y un spec que recorra las mismas páginas en 375 px y 1280 px, en claro y oscuro, y en estados clave: drawer del carrito abierto, AuthModal abierto, cada paso del checkout, estados vacío y de error, menús y diálogos. Meta: cero violaciones serias o críticas; documentá y justificá lo que quede. Revisá con atención el contraste en ambos temas (en la fase de diseño se detectó que el borde #A8B89A sobre #FFFBE9 da 2,03:1).

**Accesibilidad manual** (documentá en docs/qa/accesibilidad-manual.md): recorrido solo con teclado de todo el flujo de compra y del panel (orden de tabulación, foco visible, trampa de foco en modales y drawers, Escape, devolución del foco, skip link), zoom al 200 % y texto agrandado sin pérdida de contenido, `prefers-reduced-motion`, `prefers-color-scheme`, y la Home sin WebGL (fallback de la galleta). Aclará en el informe que NO se probó con un lector de pantalla real (no tenés acceso), y listá qué debería probar yo con uno.

**Rendimiento.**
- Analizá el bundle (tamaños por chunk, dependencias más pesadas, duplicados) y verificá que Three.js y GSAP solo se carguen donde se usan, y que /admin no se descargue fuera del panel.
- Imágenes: formatos modernos (WebP o AVIF) donde convenga, `width` y `height`, `loading="lazy"` bajo el pliegue, `fetchpriority="high"` en la imagen crítica del hero, y tamaños adecuados.
- Fuentes: Playfair Display y Lato solo con los pesos usados, `font-display: swap`, `preload` de las críticas y `preconnect` a la API.
- Backend: revisá consultas lentas o repetidas (N+1) en el listado de productos, el detalle, el carrito y los pedidos, con `EXPLAIN` sobre las más usadas; verificá índices (slug, relaciones de tags, pedidos por usuario y fecha) y proponé las migraciones necesarias SIN aplicarlas (dejalas para que yo las lea). Activá compresión gzip en la API y cabeceras de caché para las imágenes subidas, que tienen nombres aleatorios.

**SEO básico.** `robots.txt` con `Disallow: /admin`, `meta robots noindex` en /admin y /cuenta, `canonical` por página, etiquetas Open Graph básicas y datos estructurados `Product` en la Ficha (precio en UYU, disponibilidad). Aclará en el informe la limitación de ser una SPA renderizada en el cliente (no hay SSR) y qué implica.

**Resiliencia.** Con Playwright: red lenta (por ejemplo 3G rápida), API caída o devolviendo 500 (estados de error con reintento, sin pantallas rotas), 404, sesión vencida a mitad del checkout, carrito vacío, y una prueba de humo del flujo de compra en Chromium, Firefox y WebKit. Si los navegadores no se pueden instalar por restricciones de red, decilo y seguí con los demás.

**Arreglos.** Corregí los hallazgos por prioridad: primero errores de accesibilidad serios y críticos, después rendimiento y SEO, después detalles. Todo cambio visual respeta DESIGN.md. Si un arreglo exige un cambio de diseño que no esté definido, preguntame.

**Informe.** docs/qa/informe-qa.md con una tabla antes/después de Lighthouse por página, la lista de hallazgos (severidad, dónde, cómo se arregló o por qué no), lo que queda pendiente y los comandos para repetir todas las mediciones. Agregá a package.json los scripts para correrlas (por ejemplo `qa:lighthouse`, `qa:a11y`).

## Cierre

- Tests: sumá los que correspondan (el spec de axe, el de contenido de las páginas nuevas). Todo lo anterior debe seguir pasando.
- Actualizá README, docs/estado-frontend.md, docs/progreso.md, CLAUDE.md y .env.example.
- Revisá `.gitignore` y confirmá con `git ls-files` que no hay `.env`, `node_modules`, respaldos, subidas ni reportes HTML pesados versionados.
- Ejecutá `/web-interface-guidelines` sobre los archivos nuevos o modificados de src/ con el comando real; si no está disponible, decímelo explícitamente en el reporte.

## Reporte final

Máximo 12 líneas: qué quedó terminado, los puntajes antes/después, qué quedó pendiente, qué necesita una decisión mía, qué debo probar yo (lector de pantalla, dispositivos reales) y qué comandos debo correr yo (migraciones propuestas, el script de nutrición). Si algún push falló, decímelo con los hashes de los commits locales.
