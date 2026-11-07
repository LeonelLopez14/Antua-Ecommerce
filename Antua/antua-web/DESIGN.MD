# DESIGN.md — Antojarte (alias Antua)

Sistema de diseño de un e-commerce de cookies caseras artesanales. Los agentes que generen UI deben leer este archivo antes de tocar estilos.

**Cómo leer las marcas de origen**
- `[D]` definido en `Design/design tokens.txt`, las paletas COOKIES LIGHT/DARK o el Plan de proyecto.
- `[W]` tomado de los wireframes (Home, Tienda, Ficha, Carrito, Checkout, Modal).
- `[P]` propuesta derivada, **no definida por el diseño original**. Confirmar antes de darla por cerrada.
- `[V]` regla de las Web Interface Guidelines de Vercel (texto que pegaste vos; ver sección 11).

Stack: React + Vite + Tailwind CSS v4 + GSAP + Three.js (R3F/drei) + Zustand + Axios + Lucide.

---

## 1. Visual Theme & Atmosphere

- **Marca:** Antojarte (alternativas evaluadas: Antua, Amtoja). Lema principal: "Hechas para darte un gustito." Otros: "Date un gustito, llevate un antojo" / "El gusto de darte un gusto". [D]
- **Propuesta:** cookies caseras artesanales, con opciones sin gluten, veganas y sin azúcar. Identidad cálida, natural y cercana. [D]
- **Atmósfera:** crema cálida, marrón tostado de horno, verde salvia fresco. Formas muy redondeadas (pills y radios de 12 a 24 px), sombras suaves, movimiento breve y amable. [D]
- **Modo claro es el principal; modo oscuro es el secundario.** [D]
- **Voz de los textos:** voseo rioplatense ("¿No tenés cuenta? Registrate", "Al registrarte aceptás..."). [W]
- **Categorías de producto:** Clásicas, Sin gluten, Veganas, Sin azúcar, De temporada, Packs / regalos. [D]
- **3D solo en el hero de Home.** La ficha de producto usa fotos reales o ilustraciones, nunca el modelo 3D. [W]

## 2. Color Palette & Roles

### Modo claro (principal) [D]

| Token | Hex | Rol | Uso |
|---|---|---|---|
| `text-main` | `#2E2D2C` | Texto principal | Títulos, texto, descripciones, íconos principales |
| `surface` | `#F7F5FF` | Superficies | Cards de producto, navbar, formularios, modales, carrito lateral |
| `bg` | `#FFFBE9` | Fondo principal | Fondo de página, secciones amplias, espacios en blanco |
| `accent-secondary` | `#FFF2BD` | Acento secundario | Etiquetas ("Nuevo", "Oferta"), highlights, estados hover, cajas informativas, banners promocionales |
| `accent-main` | `#8D572E` | Acento principal | Botones principales, "Agregar al carrito", precios, enlaces activos, CTA |
| `accent-tertiary` | `#A8B89A` | Acento terciario | Botones secundarios, filtros de producto, badges de ingredientes, íconos secundarios, indicadores de estado |

### Modo oscuro (secundario) [D]

| Token | Hex | Rol | Uso |
|---|---|---|---|
| `dark-bg` | `#151515` | Fondo principal | Fondo de página y secciones amplias |
| `dark-surface` | `#1E1D1C` | Superficies | Navbar, footer, formularios, modales, carrito lateral |
| `dark-card` | `#2A2826` | Tarjetas / secciones | Cards de producto, listas, bloques destacados, separadores suaves |
| `dark-text-main` | `#F5F2E8` | Texto principal | Títulos, descripciones, info clave, íconos principales |
| `dark-text-secondary` | `#CFC8BC` | Texto secundario | Fechas, detalles, placeholders, info auxiliar, íconos secundarios |
| `dark-accent-main` | `#D7A46A` | Acento principal | Botones principales, precios, enlaces activos, CTA |

### Reglas de color

- Un solo acento principal por pantalla: `accent-main` (claro) o `dark-accent-main` (oscuro). No introducir otros colores de marca.
- No usar `#000000` ni `#FFFFFF` puros. Los negros y blancos de la marca son los de las tablas. [P]
- **Botón principal en modo claro:** fondo `#8D572E`, texto `#FFFBE9`. [D]
- **Botón principal en modo oscuro:** fondo `#D7A46A`, texto `#151515`. [P] Nunca texto claro sobre `#D7A46A` (contraste 2,15:1, falla).
- **El modo oscuro no define acento secundario ni terciario.** Hasta decidirlo, los badges y hovers oscuros usan `#D7A46A` sobre `#2A2826` (6,58:1) y los filtros usan borde `#CFC8BC`. [P]

### Contraste verificado (WCAG, calculado)

| Par | Ratio | Resultado |
|---|---|---|
| `#2E2D2C` sobre `#FFFBE9` / `#F7F5FF` / `#FFF2BD` | 13,24 / 12,74 / 12,23 | AA |
| `#2E2D2C` sobre `#A8B89A` | 6,54 | AA |
| `#FFFBE9` sobre `#8D572E` (botón) | 5,72 | AA |
| `#8D572E` sobre `#FFFBE9` / `#F7F5FF` / `#FFF2BD` (precios, links) | 5,72 / 5,50 / 5,29 | AA |
| `#F5F2E8` sobre `#151515` / `#2A2826` | 16,30 / 13,11 | AA |
| `#CFC8BC` sobre `#1E1D1C` / `#2A2826` | 10,13 / 8,84 | AA |
| `#D7A46A` sobre `#151515` / `#2A2826` | 8,18 / 6,58 | AA |
| `#151515` sobre `#D7A46A` (botón oscuro) | 8,18 | AA |
| **Borde `#A8B89A` sobre `#FFFBE9`** | **2,03** | **No llega a 3:1 para límites de componentes** |

Consecuencia: el botón secundario `[D]` (borde `#A8B89A`, fondo transparente) debe llevar el texto en `#2E2D2C`, para que el significado no dependa del borde. Los **inputs** necesitan un borde más oscuro que `#A8B89A`. [P]

## 3. Typography Rules

- **Títulos:** Playfair Display (serif, artesanal). **Texto:** Lato (sans-serif, legible). [D]
- Íconos: Lucide. [D]

Los tamaños y pesos no están definidos por el diseño. Escala propuesta: [P]

| Rol | Fuente | Tamaño | Peso | Line-height |
|---|---|---|---|---|
| Display (hero h1) | Playfair Display | `clamp(2.5rem, 5vw, 4rem)` | 700 | 1.1 |
| H2 (sección) | Playfair Display | 2.25rem | 600 | 1.2 |
| H3 (card, drawer) | Playfair Display | 1.5rem | 600 | 1.3 |
| Cuerpo | Lato | 1rem | 400 | 1.6 |
| Cuerpo pequeño / labels | Lato | 0.875rem | 400 / 700 | 1.5 |
| Precio | Lato | 1.25rem | 700 | 1.2 (color `accent-main`) |
| Badge / chip | Lato | 0.75rem | 700 | 1 |
| Botón | Lato | 1rem | 700 | 1 |

Las dos familias están en Google Fonts. Cargar solo los pesos usados.

## 4. Component Stylings

### Botones [D]
- **Primario:** pill (`999px`), fondo `accent-main`, texto `bg`. Hover: elevación leve y cambio de color suave. "Agregar al carrito", "Comprar ahora" (en ficha, ambos CTA conviven), "Ir a checkout", "Iniciar sesión", "Crear cuenta".
- **Secundario:** pill, borde `accent-tertiary`, fondo transparente, texto `text-main`. Ej.: "Continuar con Google" [W].
- Padding sugerido: `px-6 py-3`. [P]

### Chips y badges [D]
- Radio `999px`. Etiquetas ("Nuevo", "Oferta") y highlights en `accent-secondary` con texto `text-main`.
- Badges de ingredientes y filtros activos en `accent-tertiary` con texto `text-main`.
- Íconos sugeridos de Lucide para los tags (verificar nombres en lucide.dev): `WheatOff` (sin gluten), `Vegan`, `CandyOff` (sin azúcar), `Leaf`, `Cookie`. [P]

### Cards de producto [D][W]
- Radio `20px`, padding `24px`, sombra ligera. Fondo `surface` (claro) o `dark-card` (oscuro).
- Imagen del producto con radio `20px`. Sin modelo 3D.
- Hover: elevación leve (ver sección 6).

### Inputs [D]
- Radio `12px`. Fondo `bg` dentro de modales y formularios sobre `surface` [W]. Borde sutil. [W] Usar un borde más oscuro que `#A8B89A` por contraste (sección 2). [P]
- Link "¿Olvidaste tu contraseña?" alineado a la derecha del campo contraseña. [W]

### Navbar [W]
- Fondo `surface`. Logo, categorías, buscador, ícono de cuenta, ícono de carrito.
- En checkout la navbar muestra solo el logo.

### Footer [W]
- Fondo `#2E2D2C`, links, redes sociales, newsletter. **Conflicto a decidir:** la paleta lista "Footer" dentro de Superficies (`#F7F5FF`), pero el wireframe de Home lo dibuja oscuro. Este archivo sigue el wireframe. Texto sobre él en `#F7F5FF` (12,74:1). [P]

### Home [W]
- **Hero:** título + subtítulo + CTA pill a la izquierda; modelo 3D (galleta o paquete) rotando con el scroll a la derecha. Al seguir el scroll, el bloque cambia de texto y aparece un mini carrusel 3D de paquetes. Implementado con GSAP ScrollTrigger y `pin` en una sola sección, no como dos rutas.
- **Categorías rápidas:** franja `accent-secondary` con chips (Clásicas, Sin gluten, Veganas, Sin azúcar, Packs).
- **Destacados / bestsellers:** grilla de cards sobre `surface`.
- **Banner de ingredientes naturales / sin gluten:** bloque `accent-tertiary` con CTA.

### Tienda (catálogo) [W]
- Sidebar de filtros en `surface` (categoría con checkboxes múltiples, rango de precio). Grilla de productos sobre `bg`.
- El selector de orden (más vendidos, precio) va arriba a la derecha de la grilla, no en el sidebar.
- En mobile los filtros colapsan a drawer/modal, con botón "Filtros" en el header de la grilla.

### Ficha de producto [W]
- Galería a la izquierda (imágenes reales o ilustraciones + miniaturas) sobre `bg`. Panel de compra a la derecha en `surface`: tags, título, precio, descripción, cantidad, "Agregar al carrito" y "Comprar ahora".
- Ingredientes, información nutricional y reviews **siempre visibles** abajo, sin tabs.

### Carrito (drawer lateral) [W]
- Panel desde la derecha en `surface` (oscuro: `dark-surface`), con overlay oscuro sobre la página.
- Cada ítem en `accent-secondary`: imagen, nombre, variante, stepper de cantidad, botón quitar, precio.
- Campo de cupón antes de los totales (borde punteado en el wireframe).
- Subtotal, envío estimado y CTA "Ir a checkout" (bloque `accent-main`) quedan **fijos abajo**.
- Entrada y salida con GSAP: slide del panel + fade del overlay.

### Checkout (página en 4 pasos) [W]
- Dirección → Envío → Pago → Confirmación. Barra de pasos arriba.
- Formulario del paso activo a la izquierda en `surface`. **Resumen del pedido** a la derecha en `accent-secondary`, fijo e idéntico en los 4 pasos (ítems, cupón, envío, subtotal, total).
- Guest checkout habilitado. Envío único y fijo, sin selector. La opción de registrarse se ofrece recién en la confirmación.

### Modal de cuenta (`AuthModal`) [W]
- Un solo componente con tabs "Iniciar sesión" / "Registrarme". Overlay oscuro, modal centrado, radio `24px`, fondo `surface`.
- Tabs en pill: la activa en `accent-main` con texto claro, la inactiva sobre pista `accent-secondary`.
- Login: email, contraseña, botón primario, divisor "o", botón secundario "Continuar con Google" (a confirmar si entra en el alcance). Registro: nombre completo, email, contraseña, confirmar contraseña, texto legal debajo del botón, sin login social.
- Cierre con X, clic en el backdrop o Escape; los tres reinician el formulario. Crossfade de GSAP entre tabs.

## 5. Layout Principles

**Espaciado, escala de 8 px** [D] y su clase de Tailwind:

| Token | Valor | Uso | Tailwind |
|---|---|---|---|
| XS | 4 px | Entre ícono y texto | `1` |
| SM | 8 px | Elementos pequeños | `2` |
| MD | 16 px | Padding interno de componentes | `4` |
| LG | 24 px | Separación entre tarjetas | `6` |
| XL | 32 px | Secciones | `8` |
| XXL | 48 px | Grandes bloques de contenido | `12` |
| XXXL | 64 px | Separación entre secciones principales | `16` |

**Radios** [D]

| Elemento | Radio | Tailwind |
|---|---|---|
| Botones, chips, badges | 999 px | `rounded-full` |
| Inputs | 12 px | `rounded-xl` |
| Cards e imágenes de producto | 20 px | `rounded-card` (token propio) |
| Modal | 24 px | `rounded-3xl` o `rounded-modal` |

- Fondo de página `bg`; los bloques elevados (navbar, cards, modales, drawer) en `surface`. Mucho espacio en blanco.
- Ancho máximo del contenido: no definido. Sugerido `max-w-7xl` centrado. [P]

## 6. Depth & Elevation

- Sombras "suaves y sutiles, con ligera elevación al hover". [D] Valores propuestos: [P]
  - Reposo (claro): `0 2px 8px rgba(46,45,44,0.08)`
  - Hover (claro): `0 8px 24px rgba(46,45,44,0.12)` + `translateY(-2px)`
  - Oscuro: la jerarquía se construye con los escalones `#151515` → `#1E1D1C` → `#2A2826`; sombra solo bajo elementos flotantes: `0 8px 24px rgba(0,0,0,0.4)`
- **Animaciones:** 200 a 300 ms, `ease-out`, con elevación y cambios de color suaves. [D]
- Respetar `prefers-reduced-motion`: sin parallax ni pin del hero, y transiciones reducidas a fundidos. [P]

## 7. Do's and Don'ts

**Do**
- Usar solo los tokens de la sección 2. Cada color nuevo debe justificarse.
- Pills para todos los botones y chips; `20px` para cards; `24px` para modal.
- Dar a cada ícono-botón un nombre accesible (`aria-label`) y un foco visible.
- Mostrar el precio siempre en `accent-main`.
- Mantener el resumen del checkout idéntico entre pasos.
- Escribir los textos en voseo rioplatense y tono cálido.

**Don't**
- No usar el modelo 3D fuera del hero de Home.
- No poner ingredientes, nutrición ni reviews detrás de tabs.
- No agregar un selector de método de envío (es único y fijo).
- No usar texto claro sobre `#D7A46A` ni depender solo del borde `#A8B89A` para delimitar un control.
- No usar gradientes de colores ajenos a la paleta, ni negro o blanco puro.
- No convertir el carrito ni el login en páginas completas: son drawer y modal.

## 8. Responsive Behavior

Los breakpoints no están definidos; usar los de Tailwind v4 (`sm 640`, `md 768`, `lg 1024`, `xl 1280`). [P]

- Filtros de Tienda: sidebar en desktop; drawer/modal con botón "Filtros" en mobile. [W]
- Navbar: en mobile, buscador y categorías pasan a un menú. [P]
- Ficha: dos columnas en desktop; galería arriba y panel de compra debajo en mobile. [P]
- Checkout: dos columnas en desktop; resumen del pedido colapsable arriba del formulario en mobile. [P]
- Drawer del carrito: ancho completo en pantallas chicas. [P]
- Objetivos táctiles de al menos 44 px. [P]

## 9. Agent Prompt Guide

### Tokens para Tailwind v4 (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  /* Modo claro */
  --color-text-main: #2E2D2C;
  --color-surface: #F7F5FF;
  --color-bg: #FFFBE9;
  --color-accent-secondary: #FFF2BD;
  --color-accent-main: #8D572E;
  --color-accent-tertiary: #A8B89A;

  /* Modo oscuro */
  --color-dark-bg: #151515;
  --color-dark-surface: #1E1D1C;
  --color-dark-card: #2A2826;
  --color-dark-text-main: #F5F2E8;
  --color-dark-text-secondary: #CFC8BC;
  --color-dark-accent-main: #D7A46A;

  --font-display: "Playfair Display", serif;
  --font-sans: "Lato", sans-serif;

  --radius-card: 20px;
  --radius-modal: 24px;
}
```

Por defecto `dark:` sigue la preferencia del sistema. Para un toggle manual, definir un `@custom-variant dark` basado en la clase `.dark` (verificar la sintaxis en la documentación de Tailwind v4).

### Referencia rápida

- Fondo: `bg-bg dark:bg-dark-bg` · Superficie: `bg-surface dark:bg-dark-surface` · Card: `bg-surface dark:bg-dark-card`
- Texto: `text-text-main dark:text-dark-text-main` · Secundario (oscuro): `dark:text-dark-text-secondary`
- Botón primario: `rounded-full bg-accent-main text-bg dark:bg-dark-accent-main dark:text-dark-bg px-6 py-3 font-bold transition duration-200 ease-out hover:-translate-y-0.5`
- Card: `rounded-card p-6 shadow-sm`

### Prompts de ejemplo

- "Construí la Tienda de `DESIGN.md`: sidebar de filtros en `surface`, grilla de cards con radio 20 px y padding 24 px, orden arriba a la derecha, y filtros en drawer en mobile."
- "Implementá el drawer del carrito según la sección 4: overlay oscuro, ítems en `accent-secondary`, cupón, y subtotal con CTA fijos abajo. Animá con GSAP (slide + fade)."
- "Revisá este componente contra `DESIGN.md`: tokens, radios, contraste y modo oscuro. Listá solo las desviaciones."

## 11. Reglas de interfaz web (Vercel Web Interface Guidelines) [V]

Resumen de las reglas del texto de Vercel que pegaste, aplicadas a Antua. Para auditar código: "revisá `<archivo>` contra la sección 11 de `DESIGN.md` y devolvé `archivo:línea - problema`, sin preámbulo".

**Accesibilidad**
- Botones solo con ícono (carrito, cuenta, cerrar, quitar ítem) llevan `aria-label`; los íconos decorativos de Lucide llevan `aria-hidden="true"`.
- `<button>` para acciones, `<a>`/`<Link>` para navegación. Nunca `<div onClick>`.
- Todo input con `<label>` (`htmlFor`) o `aria-label`. Toda imagen con `alt` (`alt=""` si es decorativa).
- HTML semántico antes que ARIA; encabezados jerárquicos `h1` a `h6`; skip link al contenido principal.
- Actualizaciones asíncronas (toasts, validaciones, "producto agregado") con `aria-live="polite"`.

**Foco**
- Foco visible con `focus-visible:ring-*` en todo elemento interactivo. Nunca `outline-none` sin reemplazo.
- Usar `:focus-visible` (no `:focus`) y `:focus-within` en controles compuestos (stepper de cantidad).
- Navbar/drawer/overlays fijos no deben tapar el elemento enfocado.

**Formularios** (AuthModal y Checkout)
- `autocomplete` y `name` significativos; `type` correcto (`email`, `tel`) e `inputmode`.
- Nunca bloquear el pegado. `spellCheck={false}` en email y códigos (cupón).
- Etiqueta clickeable; checkbox/radio con una sola zona de clic (filtros de Tienda).
- El botón de enviar sigue habilitado hasta que arranca la request, y muestra spinner mientras dura.
- Errores en línea junto al campo; al enviar, foco en el primer error.
- Placeholders terminan en `…` y muestran un ejemplo. Avisar antes de salir con cambios sin guardar (checkout).

**Animación (GSAP)**
- Respetar `prefers-reduced-motion`. Animar solo `transform` y `opacity`. Nunca `transition: all`: listar las propiedades (en Tailwind, `transition-[transform,box-shadow]`, no `transition`).
- Definir bien `transform-origin`. Las animaciones deben poder interrumpirse. Movimiento automático de más de 5 s necesita pausa.

**Tipografía y contenido**
- `…` en vez de `...`, comillas curvas, espacios no cortantes en cifras con unidad (`500&nbsp;g`).
- Estados de carga terminan en `…` ("Cargando…"). `tabular-nums` en precios y totales. `text-wrap: balance` en títulos.
- Contenedores de texto con `truncate`, `line-clamp-*` o `break-words`; hijos de flex con `min-w-0`.
- Resolver estados vacíos (carrito vacío, sin resultados) en vez de mostrar UI rota. Prever reviews cortas y larguísimas.
- Etiquetas de botón específicas ("Agregar al carrito", no "Continuar"). Los errores dicen cómo arreglarlo.
- La regla de Vercel de Title Case es para inglés: **no aplica** al español de Antua. Mantener el voseo de la sección 1.

**Imágenes y rendimiento**
- `<img>` con `width` y `height` explícitos (evita saltos de layout). `loading="lazy"` bajo el pliegue; imagen crítica del hero con `fetchpriority="high"`.
- Listas de más de 50 ítems: virtualizar o `content-visibility: auto`. Sin lecturas de layout (`getBoundingClientRect`) en el render.
- `<link rel="preconnect">` para dominios de assets y `preload` con `font-display: swap` para las fuentes críticas.

**Navegación y estado**
- La URL refleja el estado: filtros, orden y paginación de Tienda en query params. Los links usan `<Link>` para permitir Ctrl/Cmd+clic.
- Acciones destructivas (vaciar carrito, quitar dirección) piden confirmación o dan opción de deshacer.

**Táctil y layout**
- `touch-action: manipulation`; `overscroll-behavior: contain` en modal y drawer. `autoFocus` solo en escritorio y en un único input.
- Gestos (swipe) con alternativa de clic y teclado. `env(safe-area-inset-*)` en layouts a sangre completa.
- Flex/grid antes que medir con JS.

**Modo oscuro y localización**
- `color-scheme: dark` en `<html>` cuando el tema es oscuro; `<meta name="theme-color">` igual al fondo; `<select>` nativo con `background-color` y `color` explícitos.
- Fechas y precios con `Intl.DateTimeFormat` / `Intl.NumberFormat` (moneda y locale), nunca formatos escritos a mano.
- Nombre de marca con `translate="no"`.

**Anti-patrones a marcar siempre**: `user-scalable=no`, `onPaste` con `preventDefault`, `transition: all`, `outline-none` sin reemplazo, `<div>` con `onClick`, imágenes sin dimensiones, inputs sin label, botones de ícono sin `aria-label`, formatos de fecha/número a mano, `autoFocus` sin justificación.

## 12. Decisiones abiertas

1. **Footer:** `#2E2D2C` (wireframe) o `#F7F5FF` (paleta). El archivo sigue el wireframe.
2. **Modo oscuro sin acento secundario/terciario:** definir colores de badges, filtros y hovers.
3. **Escala tipográfica, sombras, ancho máximo y breakpoints:** son propuestas `[P]`.
4. **Borde de inputs y del botón secundario:** `#A8B89A` no alcanza 3:1 sobre `#FFFBE9`.
5. **Login social (Google):** pendiente de confirmar alcance.
6. **Logo:** no está definido en el material.
7. **Panel de Admin:** fuera del mapa del sitio por ahora.