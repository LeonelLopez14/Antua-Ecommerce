# Estado del frontend de Antojarte

Última actualización: 21/11/2026 (Fase 15: correos, exportaciones, Home 3D y pulido). Stack: React 19 + TypeScript estricto + Vite 8 + Tailwind v4 + GSAP + Three.js/R3F + Zustand + Axios + Lucide. Gestor de paquetes: **pnpm**. Registro detallado por fase: [`progreso.md`](./progreso.md).

## Qué está hecho

| Área | Ruta / componente | Notas |
|---|---|---|
| Home | `/` | Hero con galleta 3D procedural (botón para pausar la flotación), pin y scrub con ScrollTrigger, categorías, destacados (API) y banner de ingredientes. Three/R3F va en un chunk que solo baja la Home. |
| Tienda | `/tienda`, `/tienda/:categoria` | Filtros, orden y paginación en la URL, resueltos en el backend. `/tienda/sin-gluten` redirige a `/tienda?categoria=sin-gluten`. |
| Ficha | `/producto/:slug` | Galería, variante en la URL, stock, "Agregar al carrito" y "Comprar ahora". Tabla nutricional (valores de ejemplo, con la nota). Reseñas siempre visibles, con formulario y edición o borrado de la propia. JSON-LD `Product`. |
| Carrito | `CartDrawer` | Drawer con stepper, "Deshacer", cupón, aviso de cupón retirado, plazo de envío y totales del backend. |
| Cuenta | `AuthModal`, menú de cuenta | Login y registro con merge del carrito de invitado. Menú con "Mis pedidos", "Direcciones" y "Cerrar sesión". |
| Checkout | `/checkout?paso=1..4` | Dirección → Envío → Pago → Confirmación. Guest checkout, direcciones guardadas, resumen fijo, pedido sin duplicados (doble clic y recarga), aviso de precio cambiado y aviso al salir con datos sin guardar. |
| Pagos | `/pago/exitoso`, `/pago/pendiente`, `/pago/fallido` | Mercado Pago Checkout Pro (solo pruebas): el estado lo informa el servidor, nunca la URL. Con credenciales sin cargar, el checkout registra el pedido y se coordina el pago. |
| Mis pedidos | `/cuenta/pedidos`, `/cuenta/pedidos/:id` | Lista con estado, fecha y total. Detalle con precios snapshot; si está entregado, links para reseñar. |
| Direcciones | `/cuenta/direcciones` | Alta, edición, borrado con confirmación y predeterminada. |
| Perfil | `/cuenta/perfil` | Nombre, teléfono y cambio de contraseña. |
| Recuperar contraseña | `/olvide-mi-contrasena`, `/restablecer-contrasena` | Token de un solo uso. Sin SMTP, el link aparece en el log de la API. |
| Institucionales | `/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/terminos`, `/privacidad` | Texto real de `docs/contenido-sitio.md`, verificado contra la app. Términos y Privacidad con aviso de "Borrador de práctica", índice y fecha. Enlazadas desde el footer y el menú "Ayuda" de la Navbar. |
| Pedido de invitado | `/pedido/:id#t=<token>` | El enlace del correo de confirmación. Token en el fragmento; sin token o con uno equivocado, "No encontramos ese pedido". noindex. |
| Errores | 404 y `RouteError` | 404 con la marca. ErrorBoundary global (errorElement del router) con "Reintentar", que también cubre un chunk que no se pudo bajar. |
| Tema | `ThemeToggle` | Sistema → claro → oscuro, guardado en localStorage. `public/theme-init.js` lo aplica antes de pintar (fuera de `index.html` para que la CSP no necesite `unsafe-inline`); `theme-color` acorde. |
| SEO básico | `usePageMeta`, `useNoIndex`, `useJsonLd` | Título, description, `canonical` y Open Graph por página; `noindex` en cuenta, checkout y panel; `robots.txt` excluye `/admin`, `/cuenta` y `/checkout`. Sin SSR: quien no ejecuta JavaScript ve los valores de `index.html`. |
| Despliegue | `antua-web/Dockerfile`, `deploy/caddy/` | Build de producción servido por Caddy: `/api` en el mismo dominio, HTTPS (interno o Let's Encrypt), CSP sin `unsafe-*`, caché inmutable de `/assets` y fallback de SPA. Ver [`despliegue.md`](./despliegue.md). |
| Administración | `/admin/*` | Solo para admins, en un chunk aparte (96,8 kB, 25 kB gzip) que la tienda no descarga. Resumen con gráfico, productos (variantes, stock e imágenes), tags, cupones, pedidos (estado, nota e historial), reseñas, usuarios (solo lectura) y auditoría. Ver [`admin.md`](./admin.md). |

Reglas que respeta todo el código:
- **DESIGN.md:** tokens de diseño (los únicos hex sueltos están en `three/cookie/cookieConfig.ts` y en `public/theme-init.js`), radios de la escala, claro y oscuro, y voseo.
- **Sección 11 de DESIGN.md:** foco visible, sin `transition: all`, imágenes con dimensiones, `Intl` para precios y fechas, y reduced motion en todas las animaciones.
- **Montos:** ninguno se calcula en el cliente. Moneda única UYU con `es-UY` (`lib/format.ts`).

### Calidad

- **Front:** `pnpm typecheck`, `pnpm lint` y `pnpm build` sin errores; unit tests con Vitest; e2e con Playwright del flujo de invitado (desktop y mobile) y del panel.
- **Back:** build, unit tests y e2e contra la base `antua_test`, con una matriz de autorización sobre todas las rutas `/admin`.
- **QA (Fase 13):**
  - Lighthouse: accesibilidad 100 en todas las páginas y rendimiento móvil entre 89 y 95 en las páginas sin 3D.
  - axe-core: 0 violaciones en 150 análisis.
  - Teclado y resiliencia: specs propios.
  - Detalle y comandos en [`qa/informe-qa.md`](./qa/informe-qa.md).
- **Despliegue (Fase 14):** `pnpm test:e2e:deploy` (invitado, con cuenta, panel y CSP) pasa contra Caddy; axe y teclado también. Lighthouse por el proxy: Tienda 98, Ficha 97 y Home 67 en móvil (ver [`despliegue.md`](./despliegue.md#qué-se-probó-en-local)).
- **Capturas** de los recorridos en [`docs/checks/`](./checks/). No se versionan.

## Cómo correr todo

Desde cero, con Docker, variables de entorno, migraciones y datos de prueba: ver el [README de la raíz](../../README.md). En un servidor: [`despliegue.md`](./despliegue.md).

En esta máquina la base corre en el contenedor `antua-mysql` (`127.0.0.1:3307`; el 3306 es un MariaDB del sistema que no hay que tocar).

Para probar los pagos sin credenciales: levantá la API con `PAYMENTS_SIMULATED=true MP_WEBHOOK_SECRET=<secreto>` y usá `pnpm payments:simulate <pedido> <estado>`. El detalle está en [`payments-design.md`](./payments-design.md).

## Qué falta

- **Pagos reales de prueba:** faltan las credenciales y una URL pública (ver abajo). El flujo se probó con un proveedor simulado y eventos firmados.
- **Correo real:** el SMTP ya está implementado (`MAIL_TRANSPORT=smtp`). Falta configurarlo con tu proveedor y dominio (SPF, DKIM y DMARC). En desarrollo se prueba con Mailpit.
- **Textos legales:** Términos y Privacidad son un borrador de práctica (con el aviso visible); antes de un uso real necesitan revisión legal.
- **Información nutricional:** los valores cargados son de ejemplo (`pnpm --filter antua-api nutrition:examples`, reversible). La caja surtida no tiene valores.
- **Pendientes de QA:** lector de pantalla real, la Home 3D en un teléfono con GPU (Lighthouse no tiene GPU y recibe el poster), WebKit en Linux (en Windows ya pasa) y la migración de índices propuesta (ver `qa/informe-qa.md`).
- **Despliegue:** la puesta en marcha real en srv-proyecto (guía en [`despliegue.md`](./despliegue.md)); la primera corrida de la CI en GitHub. Mercado Pago de prueba: [`mercadopago-prueba.md`](./mercadopago-prueba.md).
- **Panel:**
  - no hay reembolsos desde el panel (se hacen en Mercado Pago);
  - no hay gestión de roles (es a propósito, ver [`admin.md`](./admin.md));
  - la exportación CSV es de pedidos y productos (no de usuarios ni de reseñas).

## Decisiones abiertas

1. **Moneda y país:** resuelto, UYU con `es-UY` en toda la app. El contacto es `contacto@antojarte.example` (dominio reservado, a propósito).
2. **Valor real de `SHIPPING_FLAT_RATE`** y de `SHIPPING_ETA_DAYS` (esta última no está en el `.env`, así que hoy no se muestra plazo).
3. **Verificación de email:** no existe. Por eso `POST /auth/register` responde 409 si el email ya existe (revela cuentas), y por eso los pedidos nunca se vinculan por email.
4. **Pagos duplicados:** si alguien abre dos checkouts y paga los dos, el segundo queda registrado y hay que devolverlo a mano. Lo mismo con un pago aprobado después de vencer el pedido (`paid_after_cancel`).
5. **Estado logístico:** resuelto. El panel cambia `orders.status` con una máquina de estados validada en el servidor (ver [`admin.md`](./admin.md)).
6. **Footer oscuro vs. surface:** sigue el wireframe (`#2E2D2C`); DESIGN.md §12 lo deja abierto.
7. **JWT en localStorage:** simple para una SPA; la alternativa más segura es una cookie httpOnly.
8. **Login con Google:** decidido que por ahora no (TODO en `AuthModal.tsx`).
9. **Pedidos pagados que se cancelan:** el panel libera el stock y avisa, pero la devolución del dinero se hace a mano en Mercado Pago.
10. **Pedidos sin pago en línea** (los que se hicieron con los pagos deshabilitados): el panel deja prepararlos, porque el cobro se coordina por fuera. Si eso no es lo que querés, se cambia en `order-status.ts`.
11. **Marca:** resuelto en la Fase 14: "Antojarte" en todo el sitio. Debajo de 360 px el logo es solo texto.
12. **Borde del botón secundario:** resuelto en la Fase 15 con el token `border-control` (3:1 en claro y oscuro).
13. **Migración de índices propuesta:** `antua-api/src/database/proposed/`, para leer y aplicar (paso opcional en `despliegue.md`).
14. **Despliegue:** dominio, modo de HTTPS (`internal` o `public`) y si se abre o no a internet.
15. ~~**Emails de prueba `@antua.test`**~~ **Resuelto en la Fase 16:** el seed, los e2e y los tests usan `@antojarte.example`, y `seed:clean` borra las cuentas de los dos dominios.
16. **`updated_at` en productos:** daría un `lastmod` exacto en el sitemap (hoy sale de la auditoría del panel), pero requiere una migración.
