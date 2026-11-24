# Informe de QA: Fase 13

Fecha: 17/11/2026. Rama `feat/fase-13-contenido-qa`. Detalle de Lighthouse en [`lighthouse-resumen.md`](./lighthouse-resumen.md) y del recorrido de accesibilidad en [`accesibilidad-manual.md`](./accesibilidad-manual.md).

## Resumen

- **Accesibilidad:** Lighthouse da 100 en todas las páginas, panel incluido. axe-core no encuentra **ninguna violación** en 150 análisis (375 y 1280 px, claro y oscuro, con drawer, modal, menús, cada paso del checkout, estados vacío y de error, cuenta y panel). El teclado está cubierto por 10 pruebas automatizadas. Se corrigieron 5 problemas reales; ver A1 a A5.
- **Rendimiento:** en móvil, todas las páginas sin 3D quedan entre 89 y 95 (objetivo: 85). La Home con 3D baja su LCP de 4,8 a 3,1 s; su TBT no se puede medir bien sin GPU (ver P4).
- **SEO:** 100 en las páginas públicas. Checkout y Mis pedidos dan 66-69 **a propósito**: son privadas, con `noindex` y fuera de `robots.txt`.
- **Resiliencia:** red lenta, API caída o con error 500, 404, sesión vencida y carrito vacío, sin pantallas rotas. La compra funciona en Chromium, Firefox y WebKit (WebKit se probó el 20/11 en Windows; ver "Verificación en Windows").

## Lighthouse antes / después (móvil, rendimiento · LCP)

| Página | Antes | Después |
|---|---|---|
| Home (3D) | 49 · 4,8 s | 60 · 3,1 s |
| Tienda | 89 · 3,2 s (mediana de 3: 78) | 90 · 3,1 s (mediana de 3: 90) |
| Ficha | 90 · 3,2 s | 89 · 3,3 s (escritorio: 91 → 99, CLS 0,17 → 0) |
| Checkout (con carrito) | 90 · 3,2 s | 89 · 3,3 s |
| Preguntas frecuentes | 91 · 3,1 s | 95 · 2,5 s |
| 404 | 92 · 3,0 s | 95 · 2,5 s (escritorio: CLS 0,13 → 0) |
| Mis pedidos (con sesión) | 90 · 3,2 s | 92 · 2,9 s |

Accesibilidad y buenas prácticas: 100 antes y después en todas. Las diferencias de 1 o 2 puntos (Ficha y Checkout en móvil) están dentro de la variación entre corridas: con la mediana de 3, la Ficha da 88 → 89 y el Checkout 90 → 89, y el TBT de las dos bajó (132 → 28 ms y 49 → 22 ms).

## Hallazgos

Severidad: **alta** (impide usar algo o incumple WCAG AA), **media** (molesta o degrada mucho), **baja** (detalle o mejora).

### Accesibilidad

| # | Severidad | Dónde | Qué pasaba | Cómo se arregló | Commit |
|---|---|---|---|---|---|
| A1 | Alta | Inputs, selects, cupón, stepper y pasos del checkout | Borde en `text-main/40`: 2,28:1 sobre el fondo, menos de 3:1 (WCAG 1.4.11) | `text-main/60`: 3,8:1. En oscuro ya cumplía | `7292c1ca` |
| A2 | Alta | Ficha a 320 px | La tabla nutricional nueva ensanchaba la página 64 px (WCAG 1.4.10, reflow) | Grilla con `grid-cols-1` (`minmax(0,1fr)`): la tabla scrollea dentro de su región | `2250dffc` |
| A3 | Media | Navbar a 320 px | 2 px de desborde horizontal, con el menú "Ayuda" | `gap-2` en pantallas angostas | `f519db1c` |
| A4 | Alta | Diálogos del panel (mover stock, editar variante, editar tag) | Al cerrar con Escape, el foco quedaba en `<body>` (se desmontan sin animación de salida) | `Dialog` devuelve el foco al disparador también al desmontarse | `2250dffc` |
| A5 | Alta | Checkout con la sesión vencida | Mostraba "No pudimos confirmar tu pedido: Unauthorized", en inglés y sin salida, y seguía con la sesión muerta | Ante un 401 con sesión (salvo login y cambio de contraseña) se cierra la sesión y se abre el AuthModal con "Tu sesión venció…" | `4ac91a77` |
| A6 | Baja | Botón secundario | Borde `#A8B89A` sobre `#FFFBE9`: 2,03:1 | **Resuelto en la Fase 15:** token `border-control` (`#7E8A74`, 3,50:1) y `dark-border-control` (`#8A8378`, 3,92:1 en el peor caso), medidos con `qa/contrast.ts` y en el navegador con `e2e/control-contrast.spec.ts` | Fase 15 |

### Rendimiento

| # | Severidad | Dónde | Qué pasaba | Cómo se arregló | Commit |
|---|---|---|---|---|---|
| P1 | Media | Todas las páginas | El drawer del carrito y el AuthModal (con GSAP, unos 230 kB de fuente) iban en el chunk principal | Se cargan al abrirse, con precarga al pasar el puntero o el foco por el botón. Chunk principal: **413 → 321 kB (135 → 102 kB gzip)** | `6ff37574` |
| P2 | Media | Todas las páginas | Fuentes de Google: un CSS de otro dominio que bloqueaba el render, y CLS al cambiar de fuente | Fuentes propias (`@fontsource`, solo latín y los pesos usados), `preload` de las dos críticas y respaldos con métricas ajustadas (`size-adjust` y overrides) | `6ff37574` |
| P3 | Media | Ficha y 404 (escritorio), Tienda (móvil) | CLS de 0,13 a 0,17: el footer subía mientras cargaba la página diferida, y la barra de la Tienda cambiaba de alto | `main` con alto mínimo de pantalla; el selector de orden va siempre en su propia línea en móvil | `6ff37574` |
| P4 | Media | Home con 3D | LCP de 4,8 s: el texto del hero competía con Three/R3F (881 kB) | La escena se monta con la página cargada y el navegador libre; canvas a 1,5× como máximo; sin WebGL acelerado, galleta SVG. **LCP 3,1 s.** El TBT en Lighthouse (23 a 133 s) es WebGL por software (SwiftShader, sin GPU): no representa un teléfono real | `6ff37574` |
| P5 | Media | API, catálogo | Sin compresión | gzip (`compression`, a partir de 1 kB): el catálogo pasa de 12,5 a 2,3 kB | `8424d4d7` |
| P6 | Baja | API, Ficha | `GET /products/:slug` traía todas las reseñas, que el front igual pedía aparte | Se quitaron del detalle | `8424d4d7` |
| P7 | Media | API, `orders` | `EXPLAIN`: Mis pedidos ordenaba en memoria; los rangos de fechas del panel y del resumen, y el vencimiento de pagos, recorrían toda la tabla | **Migración propuesta, sin aplicar:** `antua-api/src/database/proposed/1794900000000-OrdersIndexes.ts`. Probada en una copia de la base | `8424d4d7` |
| P8 | Baja | Tienda | El e2e del panel dejaba productos de prueba activos en la tienda | Se desactivaron, y el e2e desactiva el suyo al terminar | `39699aba` |

**Verificado sin cambios:**
- Three.js solo se baja en la Home; el panel, solo en `/admin`.
- GSAP solo donde hay diálogos (Tienda, Ficha y Checkout); Preguntas frecuentes ya no lo baja.
- Las imágenes tienen `width`, `height` y `lazy`, y la principal de la Ficha usa `fetchpriority="high"`.
- Las subidas aceptan WebP.
- Los índices de `slug`, tags y carrito ya existían.

### SEO

| # | Severidad | Qué faltaba | Cómo quedó | Commit |
|---|---|---|---|---|
| S1 | Media | `canonical` y Open Graph | `usePageMeta` pone `canonical` (ruta sin parámetros), `og:title`, `og:description` y `og:url`. En `index.html` quedan valores por defecto | `6ff37574` |
| S2 | Media | Datos estructurados | JSON-LD `Product` en la Ficha: una oferta por variante en UYU, disponibilidad según el stock y valoración si hay reseñas | `6ff37574` |
| S3 | Media | `noindex` en cuenta y checkout | `useNoIndex` en `AccountLayout`, `CheckoutLayout` y el panel; `robots.txt` excluye `/admin`, `/cuenta` y `/checkout` | `6ff37574` |

**Limitación de una SPA sin SSR:** el HTML que entrega el servidor es el mismo para todas las rutas (`index.html`). El título, la descripción, el `canonical`, Open Graph y el JSON-LD los pone JavaScript. Google ejecuta JavaScript, pero con demora y menos garantías. Los que no lo ejecutan (vistas previas de WhatsApp, Slack o Facebook, y otros buscadores) ven solo los valores por defecto. Para resolverlo haría falta prerenderizar las páginas públicas en el build, o SSR.

### Resiliencia

| Caso | Resultado |
|---|---|
| Red "3G rápida" (150 ms, ~1,6 Mb/s) | La Tienda muestra el estado de carga y después los productos, sin errores |
| API con error 500 | Estado de error sin el texto técnico; "Reintentar" recupera |
| API caída | "No pudimos conectarnos…" con reintento; la Navbar sigue usable |
| 404 de ruta y de producto | Páginas propias con salida a la Tienda |
| Sesión vencida a mitad del checkout | Ver A5 |
| Carrito vacío | El drawer lo dice; `/checkout` lleva a la Tienda con un aviso |
| Compra completa en Firefox | OK |
| Compra completa en WebKit | OK en Windows (WebKit 27.2, Playwright 1.65), 20/11. En el host Linux original no se pudo: faltaban `libicu74`, `libjpeg-turbo8` y gstreamer (`sudo pnpm exec playwright install-deps`) |

## Estado de los tests al cerrar

- **Front:** typecheck, lint y build OK; 49 unit tests; `test:e2e` 5/5; `qa:e2e` 40/40 (axe, teclado y resiliencia); compra en Firefox OK.
- **Back:** tipos (`tsc --noEmit`), lint, 69 unit tests y 96 e2e OK.

## Verificación en Windows (20/11/2026)

Se repitieron todas las mediciones en un segundo equipo (Windows 11, Node 24, pnpm 10.34, Docker Desktop), con una base nueva: migraciones versionadas, `pnpm seed` y `pnpm nutrition:examples --yes`. La migración de índices propuesta (P7) **no** se aplicó.

- **Back:** tipos, lint y build OK; 69 unit tests y 96 e2e OK.
- **Front:** typecheck, lint y build OK; 49 unit tests; `test:e2e` 5 OK (1 salteado a propósito); `qa:e2e` 40/40; compra en Firefox **y WebKit** OK.
- **Lighthouse** (`docs/qa/lighthouse/windows/` y `windows-mediana/`): mismos resultados que en el informe. Accesibilidad y buenas prácticas, 100 en todas; SEO, 100 en las públicas. En móvil: Tienda 92, Ficha 89 (mediana de 3), Checkout 89-90, Preguntas 95, 404 95, Mis pedidos 93 y Home 3D 61. Una primera corrida de la Ficha dio 76 (TBT 472 ms), pero con mediana de 3 bajó a 19 ms: era carga de la máquina, no un problema de la página.

Hallazgos nuevos, los dos de portabilidad y ya corregidos:

| # | Severidad | Dónde | Qué pasaba | Cómo se arregló | Commit |
|---|---|---|---|---|---|
| W1 | Media | `pnpm qa:build` | `VITE_API_URL=/api vite build` es sintaxis POSIX: en Windows pnpm usa cmd y falla | `shellEmulator: true` en `pnpm-workspace.yaml` | `30bf2598` |
| W2 | Media | `e2e/admin.spec.ts` | `execFileSync('pnpm')` da `ENOENT` en Windows (pnpm es un `.cmd`) | `shell` solo en Windows, con argumentos fijos | `30bf2598` |
| W3 | Baja | `env.validation.spec.ts` (API) | El test de `UPLOADS_DIR` esperaba rutas POSIX literales | Compara con `path.resolve`. El código ya era correcto | `88173d89` |

## Fase 15 (21/11/2026)

Medido contra el despliegue de prueba (Caddy con HTTPS interno, build de producción), mediana de 3 corridas. Resultados en `lighthouse/fase15-antes/` y `lighthouse/fase15-despues/`.

| Página | Dispositivo | Antes | Después |
|---|---|---|---|
| Home | móvil | 67 · LCP 2,5 s · TBT 4407 ms | **96** · LCP 2,5 s · TBT 49 ms |
| Home | escritorio | 99 · TBT 108 ms | 100 · TBT 35 ms |
| Tienda | móvil | 97 · LCP 2,3 s | 97 · LCP 2,2 s |
| Tienda | escritorio | 100 | 100 |

Accesibilidad, buenas prácticas y SEO: 100 antes y después. CLS 0 en todas.

**Qué cambió en la Home** (detalle en `progreso.md`):
- Se muestra de inmediato un **poster**: una captura de la escena real (`public/hero-cookie.webp`, 33 kB, generada con `qa/hero-poster.ts`), con `width`/`height` y `fetchpriority="high"`. Ocupa el mismo tamaño y lugar que la escena, así que el cambio no se nota y no hay CLS.
- La escena 3D se monta encima con la página cargada, el navegador libre y el hero en pantalla. Se pausa con la pestaña oculta, usa `dpr` 1 en equipos modestos y no se carga con `prefers-reduced-motion`.
- **WebGL por software** (SwiftShader, llvmpipe) ahora se detecta por el nombre del renderer y muestra solo el poster: ahí cada cuadro de la escena es una tarea larga.

**Cómo leer el 96:** el Chrome de Lighthouse no tiene GPU, así que ahora recibe el poster, como cualquier visitante con WebGL por software. El salto de TBT (4,4 s → 49 ms) es real para esos equipos. **El costo de la escena en un teléfono con GPU no lo mide este número** y sigue pendiente (punto 2 de abajo). No se usó ninguna detección de Lighthouse: la condición es la misma para cualquier navegador.

**Otros resultados de la fase:**
- axe: 0 hallazgos en todos los niveles (375/1280 px, claro y oscuro, panel con exportación incluido). Teclado, 34/34.
- Bordes de controles medidos en el navegador: claro 3,50/3,37, oscuro 4,87/4,49 (`e2e/control-contrast.spec.ts`).
- Resiliencia 6/6. Compra en Firefox y WebKit: OK. Una corrida, justo después de la suite de resiliencia, falló una vez y no se repitió en 4 intentos (intermitente).
- Correos con Mailpit: confirmación y cambio de estado, HTML en claro y oscuro, nombre con HTML inyectado sin ejecutarse (`e2e/mail.spec.ts`).
- **Hallazgo de seguridad, corregido:** el log de accesos de Caddy guardaba en claro `X-Order-Token`, `X-Guest-Token` y el `?token=` de recuperación. Ahora los filtra (`deploy/caddy/Caddyfile`).

## Pendiente

1. **Probar con un lector de pantalla real** (lista en `accesibilidad-manual.md`).
2. **Medir la Home con 3D en un teléfono con GPU** (Chrome DevTools → Performance, con throttling de CPU ×4), porque Lighthouse sin GPU no sirve para el TBT. Si se traba, habría que pausar la flotación cuando no hay interacción.
3. ~~WebKit~~: resuelto en Windows (20/11). En Linux sigue haciendo falta `sudo pnpm --filter antua-web exec playwright install-deps webkit` antes de `playwright test --project=webkit`.
4. **Leer y aplicar la migración de índices propuesta** (P7).
5. ~~Borde del botón secundario (A6)~~: resuelto en la Fase 15.
6. **Lighthouse sigue marcando detalles:**
   - el CSS propio (11 kB) bloquea el render. Extraer el CSS crítico en línea **no se hace**: la CSP prohíbe estilos en línea (`style-src 'self'`), y eso pesa más que 11 kB;
   - quedan ~43 kB de React y React Router sin usar en cada página;
   - ~~faltan los source maps de Three en la Home~~: Lighthouse ya no baja Three (recibe el poster).

   Ninguno impide llegar a los objetivos.
7. **Las imágenes que suben los admins no se convierten a WebP en el servidor:** se aceptan JPEG y PNG tal cual. Para convertirlas haría falta `sharp`.

## Cómo repetir las mediciones

Requisitos:
- la API en `:3000` con los datos de prueba (`pnpm --filter antua-api seed`);
- de preferencia, la API con pagos simulados (`PAYMENTS_SIMULATED=true MP_WEBHOOK_SECRET=…`);
- el front de desarrollo en `:5173`.

```bash
cd antua-web

# Lighthouse sobre el build de producción
pnpm qa:build && pnpm qa:preview           # en otra terminal: http://localhost:4173
QA_ADMIN_EMAIL=seed.admin@antojarte.example QA_ADMIN_PASSWORD='…' pnpm qa:lighthouse -- --run=nueva
#   opciones: --only=tienda,ficha  --runs=3 (mediana)
#   resultados: docs/qa/lighthouse/nueva/ (JSON sin capturas + resumen.md)

# Accesibilidad automática (axe-core, 375/1280 px, claro/oscuro): docs/qa/axe/resultados.json
QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… pnpm qa:a11y

# Teclado, foco, zoom y texto al 200 %, reduced motion, tema, sin WebGL
QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… pnpm qa:keyboard

# Resiliencia + compra en Firefox
pnpm qa:resilience

# Los tres specs de calidad juntos, en serie (~7 min)
QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… pnpm qa:e2e

# Todo lo de siempre (test:e2e = flujos funcionales: compra y panel)
pnpm typecheck && pnpm lint && pnpm build && pnpm test && pnpm test:e2e
```

En PowerShell, las variables se definen antes del comando: `$env:QA_ADMIN_EMAIL='…'; $env:QA_ADMIN_PASSWORD='…'; pnpm qa:a11y`.

Sin `QA_ADMIN_*`, las pruebas del panel se saltean. El admin de desarrollo se crea con `SEED_ADMIN_PASSWORD='…' pnpm --filter antua-api seed`.
