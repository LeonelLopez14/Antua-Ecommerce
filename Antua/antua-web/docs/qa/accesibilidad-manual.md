# Accesibilidad: recorrido manual y lo que axe no mide

Fecha: 17/11/2026. Fase 13. Build de desarrollo y de producción, Chromium (Playwright) y Firefox.

> **No se probó con un lector de pantalla real** (NVDA, JAWS, VoiceOver, TalkBack u Orca): en este entorno no hay acceso a uno. Lo que sigue verifica teclado, foco, zoom, movimiento, tema y el respaldo sin WebGL. Al final está la lista de lo que conviene probar con un lector.

La parte repetible de este recorrido quedó automatizada en `e2e/keyboard.spec.ts` (`pnpm qa:keyboard`, 10 pruebas). Las violaciones automáticas (contraste, roles, nombres accesibles) las cubre `e2e/a11y.spec.ts` con axe-core (`pnpm qa:a11y`): **0 violaciones** de cualquier gravedad en 150 análisis: 37 o 38 pantallas y estados (según el ancho) por cada combinación de 375/1280 px y claro/oscuro, con las reglas WCAG 2.0, 2.1 y 2.2 A/AA.

## Teclado: flujo de compra

| Qué se probó | Resultado |
|---|---|
| **Skip link**: es lo primero que recibe el foco con Tab, se ve al enfocarlo y lleva a `#contenido` | OK. El siguiente Tab cae dentro de `<main>` |
| **Orden de tabulación** en Navbar → contenido → footer | OK: sigue el orden visual. En escritorio el menú "Ayuda" es un botón con `aria-expanded` |
| **Foco visible** en links, botones, inputs, selects y checkboxes | OK: contorno de 2 px con el acento (`#8D572E` en claro, `#D7A46A` en oscuro), sin `outline-none` |
| **Drawer del carrito**: el foco entra al abrir, queda atrapado (25 Tab y 5 Shift+Tab), Escape cierra y el foco vuelve al botón del carrito | OK |
| **AuthModal**: foco atrapado, tabs con flechas, Inicio y Fin (patrón WAI-ARIA), Escape y devolución del foco | OK |
| **Checkout completo solo con teclado** (dirección → envío → pago → confirmación), con el foco en el título de cada paso | OK. Los errores del formulario llevan el foco al primer campo inválido |
| **Diálogo "¿Salir sin guardar?"** del checkout | OK: la acción segura va primero |
| **Sesión vencida a mitad del checkout** | Antes: mensaje "Unauthorized" y la sesión seguía abierta. **Corregido**: se abre el AuthModal con "Tu sesión venció" (ver `informe-qa.md`, hallazgo A5) |

## Teclado: panel de administración

| Qué se probó | Resultado |
|---|---|
| Skip link y barra lateral con Tab y Enter | OK |
| Diálogos condicionales (mover stock, editar variante, editar tag): Escape cierra y el foco vuelve al botón | **Fallaba**: el foco quedaba en `<body>`. **Corregido** en `Dialog` (hallazgo A4) |
| Tablas: los encabezados ordenables son links y la región con scroll se puede enfocar | OK |

## Zoom y texto agrandado

| Qué se probó | Resultado |
|---|---|
| **Reflow** (WCAG 1.4.10) a 640 px (1280 al 200 %) y a 320 px en Home, Tienda, Ficha, Preguntas, Términos y Checkout: sin scroll horizontal | **Fallaba** en la Ficha (64 px de más por la tabla nutricional) y en la Navbar (2 px). **Corregidos** (hallazgos A2 y A3) |
| **Texto al 200 %** con la preferencia del navegador (`Page.setFontSizes`, 32 px), en 1280 px | OK: los breakpoints en `rem` crecen con la preferencia y se usa el diseño móvil; sin desborde y con los títulos visibles completos |

Nota: forzar `font-size: 200%` en `<html>` con CSS **no** es lo mismo que la preferencia del navegador (las media queries en `rem` siguen usando 16 px). Una primera versión del test lo hacía así y daba un falso desborde de la Navbar.

## Movimiento, tema y WebGL

| Qué se probó | Resultado |
|---|---|
| `prefers-reduced-motion: reduce`: sin pin del hero, sin flotación de la galleta y diálogos con fundido corto | OK |
| `prefers-color-scheme: dark`: `color-scheme: dark` en `<html>` y `theme-color` oscuro; contraste verificado por axe en oscuro | OK |
| Botón de tema (sistema → claro → oscuro) con nombre accesible que dice el actual y el siguiente | OK |
| **Home sin WebGL** (contexto bloqueado): se ve la galleta SVG de respaldo, sin errores en la consola | OK |
| Flotación de la galleta: más de 5 s de movimiento con botón de pausa (WCAG 2.2.2) | OK |

## Contraste: lo que se revisó a mano

- **Bordes de inputs, selects, cupón y stepper:** estaban en `text-main/40` (2,28:1 sobre el fondo), por debajo de 3:1 (WCAG 1.4.11). Pasaron a `text-main/60` (3,8:1). En oscuro ya cumplían.
- **Botón secundario con borde `#A8B89A` sobre `#FFFBE9` (2,03:1):** DESIGN.md ya lo marca. El botón se identifica por su texto (`#2E2D2C`, 13:1, en negrita) y no solo por el borde, así que axe no lo marca y no es un error estricto. Pero el borde por sí solo no llega a 3:1. **Queda como decisión de diseño pendiente** (DESIGN.md §12, punto 4): oscurecer el borde (por ejemplo, `text-main/60`, 3,8:1) cambiaría el look del botón secundario.

## Qué probar con un lector de pantalla real

Con NVDA + Firefox (Windows), VoiceOver + Safari (macOS/iOS) y TalkBack + Chrome (Android):

1. **Agregar al carrito:** que se anuncie "agregado" y que, al abrirse el drawer, se lea su título.
2. **Cupón y avisos del carrito** (`aria-live`): que se lean al aplicarlo, al rechazarlo y cuando se retira por no llegar al mínimo.
3. **Checkout:** que el título de cada paso se lea al avanzar, que los errores ligados con `aria-describedby` se lean al enfocar el campo, y el aviso de precio cambiado.
4. **AuthModal:** que se anuncie como diálogo, con sus pestañas ("pestaña 1 de 2") y el aviso "Tu sesión venció".
5. **Preguntas frecuentes:** que cada `<details>` se anuncie como expandido o contraído.
6. **Tabla nutricional:** que se lean el `caption` y los encabezados de fila y columna.
7. **Estrellas de las reseñas:** que se lea "4 de 5 estrellas" y no los caracteres ★.
8. **Panel:** avisos de resultado (toasts) en `aria-live`, tablas con `aria-sort` y los diálogos de confirmación.
9. **Menú "Ayuda" y menú de cuenta:** que se anuncie si está expandido o contraído.
