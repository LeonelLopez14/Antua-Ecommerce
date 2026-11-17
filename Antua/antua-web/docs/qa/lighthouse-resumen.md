# Lighthouse: resumen antes / después

Build de producción servido con `vite preview` (con proxy `/api` → API en `:3000`, pagos simulados), Lighthouse 13.0.3 sobre el Chromium de Playwright, perfil nuevo por medición (caché vacía). Móvil = configuración por defecto de Lighthouse (Moto G Power, red 4G lenta simulada, CPU ×4); escritorio = `desktopConfig`.

- **Antes:** commit `5d3900cb` (fin de 13.1), mismo script y mismas condiciones. **Después:** código final de la Fase 13.
- Formato de cada celda: antes → después. Los JSON (sin capturas) están en `lighthouse/antes/` y `lighthouse/despues/`.
- Lighthouse varía ±2-5 puntos entre corridas. Para las tres páginas más parejas se midió además la **mediana de 3 corridas** (abajo).

## Móvil

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home (3D) | 49 → **60** | 100 | 100 | 100 | 4.8 s → **3.1 s** | 0.00 | 134.629 ms → **133.025 ms** |
| Tienda | 89 → **90** | 100 | 100 | 100 | 3.2 s → **3.1 s** | 0.00 | 126 ms → **40 ms** |
| Ficha | 90 → **89** | 100 | 100 | 100 | 3.2 s → **3.3 s** | 0.00 | 82 ms → **42 ms** |
| Checkout (con carrito) | 90 → **89** | 100 | 100 | 63 → **66** | 3.2 s → **3.3 s** | 0.00 | 50 ms → **32 ms** |
| Preguntas frecuentes | 91 → **95** | 100 | 100 | 100 | 3.1 s → **2.5 s** | 0.00 | 84 ms → **40 ms** |
| 404 | 92 → **95** | 100 | 100 | 100 | 3.0 s → **2.5 s** | 0.00 | 68 ms → **56 ms** |
| Mis pedidos (con sesión) | 90 → **92** | 100 | 100 | 63 → **66** | 3.2 s → **2.9 s** | 0.00 | 69 ms → **54 ms** |
| Panel /admin | — | 100 | 100 | — | — | — | — |

## Escritorio

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home (3D) | 68 → **69** | 100 | 100 | 100 | 1.0 s → **0.7 s** | 0.00 | 12.044 ms → **15.079 ms** |
| Tienda | 99 → **100** | 100 | 100 | 100 | 0.9 s → **0.7 s** | 0.00 | 0 ms |
| Ficha | 91 → **99** | 100 | 100 | 100 | 0.9 s → **0.7 s** | 0.17 → **0.00** | 0 ms |
| Checkout (con carrito) | 99 | 100 | 100 | 66 → **69** | 0.8 s | 0.00 | 0 ms |
| Preguntas frecuentes | 99 → **100** | 100 | 100 | 100 | 0.8 s → **0.6 s** | 0.00 | 0 ms |
| 404 | 95 → **100** | 100 | 100 | 100 | 0.8 s → **0.6 s** | 0.13 → **0.00** | 0 ms |
| Mis pedidos (con sesión) | 99 → **100** | 100 | 100 | 63 → **66** | 0.9 s → **0.7 s** | 0.05 → **0.00** | 0 ms |
| Panel /admin | — | 100 | 100 | — | — | — | — |

## Mediana de 3 corridas (Tienda, Ficha, Checkout)

| Página | Dispositivo | Rendimiento | LCP | CLS | TBT |
|---|---|---|---|---|---|
| Tienda | móvil | 78 → **90** | 3.2 s → **3.1 s** | 0.00 | 468 ms → **29 ms** |
| Tienda | escritorio | 99 → **100** | 0.8 s → **0.7 s** | 0.00 | 0 ms |
| Ficha | móvil | 88 → **89** | 3.4 s → **3.3 s** | 0.00 | 132 ms → **28 ms** |
| Ficha | escritorio | 92 → **100** | 0.8 s → **0.7 s** | 0.17 → **0.00** | 0 ms |
| Checkout (con carrito) | móvil | 90 → **89** | 3.2 s → **3.3 s** | 0.00 | 49 ms → **22 ms** |
| Checkout (con carrito) | escritorio | 99 | 0.8 s | 0.00 | 0 ms |

## Cómo leer los números

- **Objetivos del pedido:** Accesibilidad ≥ 95 y SEO ≥ 90 en todas; Rendimiento móvil ≥ 85 en las páginas sin 3D. Se cumplen, salvo el SEO de **Checkout y Mis pedidos (63-69)**, que es a propósito: son páginas privadas con `noindex` y excluidas en `robots.txt`, y Lighthouse descuenta la auditoría `is-crawlable`. No se "arregló" porque indexarlas sería un error.
- **Panel /admin:** se mide solo Accesibilidad y Buenas prácticas, como pide el prompt: 100 y 100.
- **Home con 3D:** el LCP móvil bajó de 4,8 s a 3,1 s y el de escritorio de 1,0 s a 0,7 s: el texto del hero ya no espera a Three.js (la escena se monta con la página cargada y el navegador libre). El **TBT sigue muy alto y varía muchísimo entre corridas** (de 23 s a 133 s en móvil, en las corridas de esta fase): el Chromium sin interfaz que usa Lighthouse no tiene GPU y dibuja WebGL por software (SwiftShader) en el hilo principal, y cada cuadro de la galleta flotando es una tarea larga. Ese número **no representa a un teléfono con GPU** y no se puede usar para comparar: hay que medirlo en un dispositivo real (ver informe-qa.md). No se detectó "SwiftShader" para esconder el 3D durante la medición: sería hacer trampa.
- **Checkout y Mis pedidos "antes":** en la primera versión del script el carrito y la sesión preparados no llegaban a la pestaña de Lighthouse (contexto aislado de Playwright) y se medía otra página. Se corrigió el script y se volvió a medir el commit original; estos son los números válidos.
