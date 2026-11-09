# antua-web

Tienda de Antojarte: React 19, TypeScript estricto, Vite 8, Tailwind CSS v4, GSAP, Three.js (solo en el hero), Zustand, Axios y Lucide. Para correr todo desde cero, ver el [README de la raíz](../README.md).

## Configuración

Copiá `.env.example` a `.env`. La única variable es `VITE_API_URL` (por defecto, `http://localhost:3000`). En desarrollo el front llama a `/api` y Vite reenvía a esa URL, por lo que la API no necesita CORS.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (`:5173`) |
| `pnpm typecheck` / `pnpm lint` | Chequeos |
| `pnpm build` | Build de producción en `dist/` |
| `pnpm test` / `pnpm test:watch` | Unitarios con Vitest y Testing Library |
| `pnpm test:e2e` | Flujo principal con Playwright. Requiere la API con los datos de prueba. La primera vez: `pnpm exec playwright install chromium` |

## Estructura y convenciones

La estructura de `src/`, las reglas de rutas, montos, errores y accesibilidad están en [`CLAUDE.md`](./CLAUDE.md). El sistema de diseño está en [`DESIGN.MD`](./DESIGN.MD).

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/estado-frontend.md`](./docs/estado-frontend.md) | Qué está hecho, qué falta y decisiones abiertas |
| [`docs/progreso.md`](./docs/progreso.md) | Registro por fase: qué cambió y por qué |
| [`docs/payments-design.md`](./docs/payments-design.md) | Diseño de pagos y cómo probar con Mercado Pago |
