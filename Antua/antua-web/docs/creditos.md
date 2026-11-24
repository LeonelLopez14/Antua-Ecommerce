# Créditos y licencias

Lo que usa Antojarte y de quién es. Las licencias de dependencias se sacaron con `pnpm licenses list -r --prod` (y `--dev`) el 23/11/2026, sobre el `pnpm-lock.yaml` de la Fase 16.

> El proyecto todavía **no tiene licencia propia** (no hay `LICENSE`): la elige el dueño del repo. Mientras tanto, por defecto, nadie más tiene permiso para reutilizar el código.

## Resumen de dependencias de producción (302 paquetes)

| Licencia | Paquetes | Tipo | Ejemplos |
|---|---|---|---|
| MIT | 252 | Permisiva | React, Three.js, Nest, TypeORM, axios, Tailwind |
| ISC | 18 | Permisiva | lucide-react, graceful-fs |
| Apache-2.0 | 13 | Permisiva (con aviso de patentes) | draco3d, @dimforge/rapier3d-compat, @mediapipe/tasks-vision |
| BSD-3-Clause / BSD-2-Clause | 9 | Permisiva | qs, source-map, dotenv, terser |
| OFL-1.1 | 2 | Fuentes | @fontsource/lato, @fontsource/playfair-display |
| MPL-2.0 | 2 | Copyleft débil, por archivo | lightningcss (solo al compilar el CSS) |
| GSAP Standard "no charge" | 2 | Propietaria gratuita | gsap, @gsap/react |
| MIT-0, 0BSD, PSF-2.0 | 3 | Permisivas | nodemailer, tslib, argparse |
| "Unknown" | 1 | MIT (lo dice su Readme; le falta el campo) | pause (de passport) |

**No hay GPL, AGPL ni LGPL**, ni en producción ni en desarrollo. Desarrollo (779 paquetes) suma además CC-BY-4.0 (1, datos de `caniuse-lite`), BlueOak-1.0.0, Unlicense y Python-2.0: todas permisivas y no se distribuyen con el sitio.

Qué obligan las permisivas: conservar el aviso de copyright y la licencia **en el código que se redistribuye**. El build publica el texto completo de las licencias de todo lo que entra en el bundle en **`/licencias.md`** (`build.license` de Vite, 18 paquetes).

## Fuentes: Lato y Playfair Display

- Origen: [Google Fonts](https://fonts.google.com), empaquetadas por [Fontsource](https://fontsource.org) (`@fontsource/lato`, `@fontsource/playfair-display` 5.3.0).
- Licencia: **SIL Open Font License 1.1**. Se pueden usar, incluso comercialmente, y servir desde el propio sitio. No se pueden vender las fuentes solas.
- Se sirven desde el mismo dominio: el sitio **no** hace pedidos a Google (bueno para privacidad y para la CSP).

## Íconos: Lucide

- [lucide.dev](https://lucide.dev), paquete `lucide-react` 1.23.0. Licencia **ISC** (permisiva, del estilo de MIT).
- Algunos íconos derivan de Feather (MIT). Ambas piden conservar el aviso de copyright en redistribuciones del código, que ya va en el paquete.

## 3D: Three.js y React Three Fiber

- [Three.js](https://threejs.org) 0.185.1, **MIT**. `@react-three/fiber` 9.6.1 y `@react-three/drei` 10.7.7, **MIT**.
- `drei` trae dependencias Apache-2.0 (Draco, Rapier, MediaPipe). Apache-2.0 es permisiva; pide conservar el aviso y la licencia y, si hay un archivo `NOTICE`, mantenerlo.
- La galleta 3D es **geometría propia** (procedural, `src/three/cookie/`). No hay modelos ni texturas de terceros. El poster `public/hero-cookie.webp` es una captura de esa misma escena (`qa/hero-poster.ts`).

## Animación: GSAP — revisar las condiciones

- `gsap` 3.15.0 y `@gsap/react` 2.1.2. **No es open source**: usa la **"Standard 'No Charge' GSAP License"** de Webflow ([gsap.com/standard-license](https://gsap.com/standard-license); vigente desde el 30/04/2025, modificada el 30/05/2025, revisada el 23/11/2026).
- **Uso comercial: permitido y gratis**, incluso en una tienda online, y con todos los plugins (también SplitText y MorphSVG, que antes eran pagos).
- **No exige atribución** ni incluir el texto de la licencia en el sitio.
- **Condiciones que importan:**
  1. **No usarlo en una herramienta "sin código" para que los usuarios armen animaciones** y que compita con Webflow, salvo permiso escrito. Antojarte no lo hace.
  2. **No quitar ni alterar los avisos de copyright o marca** del código de GSAP. **Hallazgo de esta fase:** el minificador de Vite los borraba. Ahora `vite.config.ts` los vuelve a poner (`postBanner`) en cada archivo que contiene GSAP; se verificó en `dist/assets/`.
  3. **Webflow puede cambiar los términos o revocar la licencia** a su criterio. Si la revoca, hay que dejar de usar GSAP. Es un riesgo de dependencia a futuro: las animaciones están acotadas (`src/lib/gsap.ts` y componentes de la Home), así que reemplazarlo por CSS o por la Web Animations API sería un trabajo de días, no un rediseño.
- Esto es un resumen para decidir, no asesoramiento legal.

## Servicios externos

- **Mercado Pago** (SDK `mercadopago` 3.6.1, MIT). El uso del servicio se rige por sus términos comerciales, aparte de la licencia del SDK.
- **Caddy** (imagen del proxy), **Apache-2.0**. **MySQL 8.4** Community (imagen), **GPL-2.0** con excepción FOSS: corre como un servicio aparte. El código de Antojarte no se enlaza con MySQL (`mysql2` es MIT), así que la GPL no se extiende a este código.
- **Node.js** (imagen base), **MIT**.

## Material propio

- Marca "Antojarte", textos, paleta (`DESIGN.md`), wireframes y documentos de `Design/` y `Documentation/`: del dueño del proyecto.
- Ilustraciones de los datos de ejemplo (`pnpm seed:demo`): SVG hechos para este proyecto, sin recursos de terceros.

## Cómo regenerar este resumen

```bash
cd Antua
pnpm licenses list -r --prod      # producción
pnpm licenses list -r --dev       # desarrollo
pnpm licenses list -r --prod --json > /tmp/licencias.json   # detalle por paquete
```
