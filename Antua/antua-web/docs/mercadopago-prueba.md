# Probar Mercado Pago en modo de prueba

Guía para hacerlo vos, cuando tengas tu cuenta de Mercado Pago. **Todo es de prueba: no se mueve dinero real.** Nada de esto está hecho todavía: la API sigue con el proveedor simulado y nadie abrió un túnel ni creó cuentas.

> Verificado el 21/11/2026 contra la documentación oficial de Mercado Pago Uruguay (enlaces en cada paso). Lo que la documentación **no** confirma está marcado con **⚠ sin verificar**: confirmalo en tu primera prueba. Mercado Pago cambia sus menús seguido: si un nombre no coincide, buscá el equivalente.

## Resumen

1. Crear la aplicación y obtener las **credenciales de prueba**.
2. (Opcional) Crear **cuentas de prueba**: comprador y vendedor.
3. Abrir **un túnel temporal** hacia tu front de desarrollo.
4. Cargar las variables, configurar el **webhook** y copiar su **clave secreta**.
5. Comprobar con `pnpm payments:check`.
6. Hacer una compra con **tarjetas de prueba** y verificar lo que cuenta.
7. Cerrar el túnel y **volver al modo simulado**.

## 1. Aplicación y credenciales de prueba

Fuente: [Credenciales](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/credentials).

1. Entrá a *Tus integraciones* con tu cuenta de Mercado Pago y creá una aplicación para **Checkout Pro**.
2. En la aplicación, elegí **Prueba** en el selector de entorno → **Credenciales**. Las de prueba se crean solas junto con la aplicación.
3. Copiá el **Access Token** de prueba.

Ojo: según la documentación actual, el Access Token de prueba **empieza con `APP_USR-`**, igual que el de producción. Por el prefijo no se distinguen. Asegurate de copiarlo con el selector en **Prueba**. No uses nunca el de producción: además, la API se niega a activar pagos con `NODE_ENV=production`.

## 2. Cuentas de prueba (opcional)

Fuente: [Cuentas de prueba](https://www.mercadopago.com.uy/developers/es/docs/checkout-pro/additional-content/your-integrations/test/accounts).

- En el panel, **Integraciones → Cuentas de prueba → Crear nueva cuenta**. Elegí el país (el comprador y el vendedor tienen que ser del mismo), una descripción y el tipo: **Vendedor** o **Comprador**.
- La tabla muestra el *Usuario*, la *Contraseña* y, si lo pide al iniciar sesión, un *Código de verificación* de 6 dígitos.
- Límites: hasta 15 cuentas, y por ahora no se pueden borrar.
- La documentación dice que para probar alcanza con las credenciales de prueba y las tarjetas de prueba, sin crear cuentas.
- **⚠ sin verificar:** si con un vendedor de prueba hay que usar las credenciales de producción **de esa cuenta de prueba**, en vez de las de prueba de tu aplicación. La documentación consultada no lo dice. Empezá con las credenciales de prueba de tu aplicación (paso 1).

## 3. Túnel temporal (lo decidís y lo abrís vos)

Mercado Pago tiene que poder llegar a tu máquina para avisar del pago (webhook) y para volver al sitio después de pagar. No acepta `localhost`. Hace falta una **URL pública HTTPS temporal**.

Con **un solo túnel** alcanza: apuntalo al front de desarrollo (`:5173`). Vite ya reenvía `/api` a la API, así que la API queda en `https://<túnel>/api`.

| Opción | Cómo | A tener en cuenta |
|---|---|---|
| **Cloudflare Tunnel, modo rápido** | `cloudflared tunnel --url http://localhost:5173` → te da `https://<algo>.trycloudflare.com` | Sin cuenta. La URL cambia cada vez que lo abrís (hay que actualizar las variables y el webhook) |
| **ngrok** | `ngrok http 5173` (requiere cuenta gratuita y su token) | La versión gratis también da una URL temporal. Tiene un panel local para ver las requests que llegan |

**Riesgos y cuidados:**
- Mientras el túnel está abierto, **cualquiera con la URL** ve tu front y tu API de desarrollo, incluido `/admin`, que pide inicio de sesión de admin. Que la URL sea difícil de adivinar no la protege.
- Usá la **base de desarrollo**, nunca datos reales. No dejes cuentas de admin con contraseñas débiles.
- Cerralo apenas termines (Ctrl+C) y no lo dejes corriendo sin mirar.
- No pegues la URL del túnel en lugares públicos.

Para que Vite acepte el nombre del túnel, en `antua-web/.env` (o al levantarlo):

```bash
DEV_ALLOWED_HOSTS=<algo>.trycloudflare.com pnpm dev
```

## 4. Variables y webhook

En `antua-api/.env`, **sacá** `PAYMENTS_SIMULATED` (no puede ir junto con credenciales reales) y completá:

```ini
MP_ACCESS_TOKEN=APP_USR-…            # el de PRUEBA (paso 1)
MP_PUBLIC_API_URL=https://<túnel>/api
MP_PUBLIC_FRONTEND_URL=https://<túnel>
PAYMENT_CURRENCY=UYU
MP_WEBHOOK_SECRET=                   # lo copiás después de configurar el webhook
```

**Webhook.** Fuente: [Webhooks](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/notifications/webhooks).

1. En *Tus integraciones*, abrí tu aplicación → **Webhooks → Configurar notificaciones**.
2. En **URL modo pruebas**, poné `https://<túnel>/api/payments/webhook` (te la muestra `pnpm payments:check`).
3. Elegí el evento de pagos: **Pagos** ("Creación y actualización de pagos", topic `payment`).
4. **Guardar**: se genera una **clave secreta** para la aplicación. Copiala a `MP_WEBHOOK_SECRET`. Si alguna vez se filtra, se cambia con **Restablecer**.

Cómo verifica la API cada aviso:
- La firma llega en el header `x-signature`, con la forma `ts=…,v1=…`.
- La cadena firmada (`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) sale del SDK oficial, no de la página de Webhooks, que no la detalla.
- Todo está en [`payments-design.md`](./payments-design.md).

## 5. Comprobar la configuración (sin conectarse)

```bash
cd antua-api
pnpm payments:check
```

- Muestra qué está bien (✓), qué conviene revisar (!) y qué falta (✗), más la URL del webhook. No llama a Mercado Pago y no imprime secretos completos.
- Sale con error mientras falte algo.
- Después reiniciá la API y el front. La API valida todo al arrancar: si algo no cierra, no levanta y dice qué falta.

## 6. Compra de prueba de punta a punta

Fuentes:
- [Tarjetas de prueba](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/test/cards). **Esa es la lista oficial vigente de números de tarjeta**: no se copian acá porque cambian.
- [Compras de prueba en Checkout Pro](https://www.mercadopago.com.uy/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases).

1. Abrí `https://<túnel>` en una ventana privada, comprá una galleta y llegá al pago. "Pagar con Mercado Pago" te lleva a la página de Mercado Pago.
2. Pagá con una tarjeta de la lista oficial. El resultado se elige con el **nombre del titular**:
   - **APRO**: aprobado.
   - **OTHE**: rechazado por error general.
   - **CONT**: pendiente.
   - **FUND**: fondos insuficientes.
   - **SECU**: código de seguridad inválido.
   - Hay más en la página.
   - Documento de prueba: el que indica la página (por ejemplo, CI 12345678).
3. Mercado Pago vuelve a `/pago/exitoso`, `/pago/pendiente` o `/pago/fallido`.

**⚠ sin verificar:** la API redirige al `sandbox_init_point` de la preferencia, a propósito, para nunca ir a la de producción. La documentación actual no menciona ni ese campo ni `init_point`. Si la página de Mercado Pago no carga o pide una cuenta real, avisá: puede que haya que pasar a `init_point` con credenciales de prueba. Es un cambio chico en `src/payments/mercadopago.provider.ts`, que hay que revisar.

**Qué comprobar:**

| Qué | Cómo |
|---|---|
| El pedido queda **pagado solo por el webhook**, no por la URL de retorno | En el log de la API aparece el webhook recibido; en el panel, el pedido pasa a "Pagado". Probá abrir `/pago/exitoso?external_reference=order-<otro id>` a mano: no cambia nada |
| El **monto** cobrado coincide con el total del pedido | Panel → el pedido → pagos: mismo monto y moneda UYU. Si no coincidiera, quedaría como `amount_mismatch` y no se marcaría pagado |
| Un **evento duplicado** no repite nada | Reenviá la notificación desde el panel de Mercado Pago (si lo permite) o esperá su reintento: el pedido sigue igual, sin otro pago ni otro descuento de stock |
| Un pago **rechazado** (OTHE) deja reintentar | El pedido queda "rechazado" y desde Mis pedidos se puede pagar de nuevo |
| Llegan los **correos** | Si configuraste Mailpit o un SMTP: la confirmación sale al crear el pedido. El cambio de estado sale cuando el panel lo pase a "En preparación" |

Según la documentación, los pagos con credenciales de prueba **pueden no disparar notificaciones**. Hay una opción "Simular el recibimiento de una notificación" en la configuración de webhooks; **⚠ sin verificar** cómo se usa exactamente. Si el aviso no llega, la página `/pago/exitoso` consulta el estado al proveedor y lo actualiza igual.

**⚠ sin verificar:** las reglas propias de la moneda UYU. La documentación de preferencias no las menciona; sus ejemplos usan otras monedas.

## 7. Volver al modo simulado

1. Cerrá el túnel (Ctrl+C).
2. En `antua-api/.env`:
   - vaciá `MP_ACCESS_TOKEN`, `MP_PUBLIC_API_URL` y `MP_PUBLIC_FRONTEND_URL`;
   - dejá `PAYMENTS_SIMULATED=true` y un `MP_WEBHOOK_SECRET` cualquiera (o vacialos todos para pagos deshabilitados).
3. Sacá `DEV_ALLOWED_HOSTS`.
4. Reiniciá la API y el front. `pnpm payments:check` tiene que decir "Modo simulado".
5. En el panel de Mercado Pago podés borrar la URL del webhook de prueba (la del túnel ya no existe).

Los tests no usan nada de esto: siempre corren con el proveedor simulado.
