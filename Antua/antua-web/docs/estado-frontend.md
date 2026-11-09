# Estado del frontend de Antua

Última actualización: 08/11/2026 (Fases 9 a 11). Stack: React 19 + TypeScript estricto + Vite 8 + Tailwind v4 + GSAP + Three.js/R3F + Zustand + Axios + Lucide. Gestor de paquetes: **pnpm**. Registro detallado por fase: [`progreso.md`](./progreso.md).

## Qué está hecho

| Área | Ruta / componente | Notas |
|---|---|---|
| Home | `/` | Hero con galleta 3D procedural (botón para pausar la flotación), pin y scrub con ScrollTrigger, categorías, destacados (API) y banner de ingredientes. Three/R3F va en un chunk que solo baja la Home. |
| Tienda | `/tienda`, `/tienda/:categoria` | Filtros, orden y paginación en la URL, resueltos en el backend. `/tienda/sin-gluten` redirige a `/tienda?categoria=sin-gluten`. |
| Ficha | `/producto/:slug` | Galería, variante en la URL, stock, "Agregar al carrito" y "Comprar ahora". Reseñas siempre visibles, con formulario y edición o borrado de la propia. |
| Carrito | `CartDrawer` | Drawer con stepper, "Deshacer", cupón, aviso de cupón retirado, plazo de envío y totales del backend. |
| Cuenta | `AuthModal`, menú de cuenta | Login y registro con merge del carrito de invitado. Menú con "Mis pedidos", "Direcciones" y "Cerrar sesión". |
| Checkout | `/checkout?paso=1..4` | Dirección → Envío → Pago → Confirmación. Guest checkout, direcciones guardadas, resumen fijo, pedido sin duplicados (doble clic y recarga), aviso de precio cambiado y aviso al salir con datos sin guardar. |
| Pagos | `/pago/exitoso`, `/pago/pendiente`, `/pago/fallido` | Mercado Pago Checkout Pro (solo pruebas): el estado lo informa el servidor, nunca la URL. Con credenciales sin cargar, el checkout registra el pedido y se coordina el pago. |
| Mis pedidos | `/cuenta/pedidos`, `/cuenta/pedidos/:id` | Lista con estado, fecha y total. Detalle con precios snapshot; si está entregado, links para reseñar. |
| Direcciones | `/cuenta/direcciones` | Alta, edición, borrado con confirmación y predeterminada. |
| Perfil | `/cuenta/perfil` | Nombre, teléfono y cambio de contraseña. |
| Recuperar contraseña | `/olvide-mi-contrasena`, `/restablecer-contrasena` | Token de un solo uso. Sin SMTP, el link aparece en el log de la API. |
| Institucionales | `/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/terminos`, `/privacidad` | **Texto provisorio** (marcado en cada página). Enlazadas desde el footer y la Navbar. |
| Errores | 404 y `RouteError` | 404 con la marca. ErrorBoundary global (errorElement del router) con "Reintentar", que también cubre un chunk que no se pudo bajar. |
| Tema | `ThemeToggle` | Sistema → claro → oscuro, guardado en localStorage. Un script en `index.html` lo aplica antes de pintar; `theme-color` acorde. |
| SEO básico | `usePageMeta` | Título y meta description por página, sin librerías. |

Reglas que respeta todo el código:
- **DESIGN.md:** tokens de diseño (los únicos hex sueltos están en `three/cookie/cookieConfig.ts` y en el script de tema de `index.html`), radios de la escala, claro y oscuro, y voseo.
- **Sección 11 de DESIGN.md:** foco visible, sin `transition: all`, imágenes con dimensiones, `Intl` para precios y fechas, y reduced motion en todas las animaciones.
- **Montos:** ninguno se calcula en el cliente.

### Calidad

- **Front:** `pnpm typecheck`, `pnpm lint` y `pnpm build` sin errores; unit tests con Vitest y un e2e con Playwright del flujo de invitado (desktop y mobile).
- **Back:** build, unit tests y e2e contra la base `antua_test` (precio cambiado, reclamo de pedidos, reseñas, cuenta, recuperación, newsletter, endurecimiento y pagos).
- **Capturas** de los recorridos en [`docs/checks/`](./checks/). No se versionan.

## Cómo correr todo

Desde cero, con Docker, variables de entorno, migraciones y datos de prueba: ver el [README de la raíz](../../README.md).

En esta máquina la base corre en el contenedor `antua-mysql` (`127.0.0.1:3307`; el 3306 es un MariaDB del sistema que no hay que tocar).

Para probar los pagos sin credenciales: levantá la API con `PAYMENTS_SIMULATED=true MP_WEBHOOK_SECRET=<secreto>` y usá `pnpm payments:simulate <pedido> <estado>`. El detalle está en [`payments-design.md`](./payments-design.md).

## Qué falta

- **Pagos reales de prueba:** faltan las credenciales y una URL pública (ver abajo). El flujo se probó con un proveedor simulado y eventos firmados.
- **Envío de mails:** sin SMTP; `MailService` escribe en el log y en producción se niega a funcionar. Para conectarlo, se implementa `MailTransport`.
- **Texto definitivo** de estas páginas, hoy marcadas como provisorias:
  - **Nosotros:** historia real de la marca.
  - **Preguntas frecuentes:** zonas de envío, plazos reales y política de alérgenos.
  - **Contacto:** email, teléfono o WhatsApp, y ubicación reales (también en el footer).
  - **Términos y condiciones:** revisión legal; cambios, cancelaciones, devoluciones y medios de pago.
  - **Política de privacidad:** revisión legal; responsable de los datos, plazos de guarda y derechos según la ley aplicable.
- **Información nutricional:** `Product` no tiene ese campo.
- **Panel de administración:** las escrituras del catálogo se protegen con `X-Admin-Key` hasta que exista un panel con roles.

## Decisiones abiertas

1. **Moneda y país.** Los pagos usan `UYU` (Mercado Pago Uruguay), pero los precios se muestran con formato `es-AR`/`ARS` y el contacto dice Buenos Aires. El símbolo se ve igual (`$`), pero hay que definir el país y unificarlo en `lib/format.ts`.
2. **Valor real de `SHIPPING_FLAT_RATE`** y de `SHIPPING_ETA_DAYS` (esta última no está en el `.env`, así que hoy no se muestra plazo).
3. **Verificación de email:** no existe. Por eso `POST /auth/register` responde 409 si el email ya existe (revela cuentas), y por eso los pedidos nunca se vinculan por email.
4. **Pagos duplicados:** si alguien abre dos checkouts y paga los dos, el segundo queda registrado y hay que devolverlo a mano. Lo mismo con un pago aprobado después de vencer el pedido (`paid_after_cancel`).
5. **Estado logístico:** nada cambia `orders.status` a "en preparación", "en camino" o "entregado" hasta que exista un panel de administración.
6. **Footer oscuro vs. surface:** sigue el wireframe (`#2E2D2C`); DESIGN.md §12 lo deja abierto.
7. **JWT en localStorage:** simple para una SPA; la alternativa más segura es una cookie httpOnly.
8. **Login con Google:** decidido que por ahora no (TODO en `AuthModal.tsx`).
