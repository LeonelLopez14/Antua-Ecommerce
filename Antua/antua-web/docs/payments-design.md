# Pagos con Mercado Pago (Checkout Pro): diseño

Proyecto de práctica: **solo credenciales y cuentas de prueba, nada de dinero real.** Con Checkout Pro la persona paga en la página de Mercado Pago, así que ningún dato de tarjeta pasa por este servidor ni por este front.

## Qué se verificó y dónde

| Dato | Fuente |
|---|---|
| Firma: `x-signature` = `ts=…,v1=…`; HMAC-SHA256 en hexadecimal sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Un par sin valor se omite. Comparación en tiempo constante. | Código del SDK oficial `mercadopago@3.6.1` (`WebhookSignatureValidator`), repositorio `mercadopago/sdk-nodejs` |
| Credenciales de prueba: se crean con la aplicación (selector **Prueba** → Credenciales). El Access Token de prueba **empieza con `APP_USR-`**, igual que el de producción: por el prefijo no se distinguen. Revisado el 21/11/2026. | [Credenciales (Uruguay)](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/credentials) |
| Webhook: *Tus integraciones → app → Webhooks → Configurar notificaciones*, "URL modo pruebas", evento **Pagos**; al guardar se genera la clave secreta ("Restablecer" la cambia). Revisado el 21/11/2026. | [Webhooks (Uruguay)](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/notifications/webhooks) |
| `data.id` se lee de la query string; el aviso llega por POST en JSON con `type: "payment"`, `action`, `data.id`. Responder 200 o 201 dentro de 22 segundos; si no, reintenta cada 15 minutos. | [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks) |
| `POST /checkout/preferences` con `Authorization: Bearer`; campos `items`, `back_urls`, `auto_return`, `external_reference`, `notification_url`, `expires`, `expiration_date_to`, `date_of_expiration`; respuesta con `init_point` y `sandbox_init_point`. | Tipos y código del SDK oficial |
| `back_urls` no acepta `localhost` ni `127.0.0.1`. `auto_return` documenta el valor `approved`. | [Back URLs](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/configure-back-urls) |
| `notification_url` tiene que ser HTTPS, sin `localhost`. | [Notificaciones de Checkout Pro](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications) |
| `date_of_expiration` aplica a pagos offline (Abitab, Red Pagos) y va en ISO 8601. | [Fecha de expiración](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/additional-settings/expiration-date) |
| `GET /v1/payments/{id}`; campos `status`, `status_detail`, `transaction_amount`, `currency_id`, `external_reference`. | Página de Webhooks y tipos del SDK |
| Estados: `approved`, `authorized`, `in_process`, `pending`, `cancelled`, `charged_back`, `in_mediation`, `refunded`, `rejected`. | [Estado del pago](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-payments/response-handling/query-results) |

**No se pudo confirmar en la documentación (verificarlo con la primera prueba real):**
- Si `sandbox_init_point` sigue siendo la URL correcta con las cuentas de prueba actuales. El código usa solo esa, justamente para que nunca se redirija a la de producción. Al 21/11/2026, las páginas de Checkout Pro de Uruguay no mencionan ni `sandbox_init_point` ni `init_point`.
- Cómo se arma la cadena firmada del webhook: la página de Webhooks muestra el formato de `x-signature` pero no el *manifest*; el que se usa sale del SDK oficial.
- Si con un vendedor de prueba hay que usar sus credenciales de producción en vez de las de prueba de la aplicación.
- La unidad de `ts`: el SDK la trata como segundos y un ejemplo de la documentación tiene 13 dígitos. Por eso **no se valida la antigüedad del aviso**. La repetición de un aviso se neutraliza de otra forma: es idempotente y el estado siempre se consulta al proveedor.
- Reglas propias de la moneda `UYU`. Las páginas consultadas no las detallan.

## Flujo

1. El front crea el pedido (`POST /orders`) y pide el pago (`POST /orders/:id/payment`).
2. El back crea la preferencia con **el total guardado en el pedido**; el cliente no manda ningún monto. Devuelve la URL y el front redirige.
3. Mercado Pago avisa por webhook (`POST /payments/webhook`). Se verifica la firma, se consulta el pago real al proveedor y se valida monto y moneda.
4. El estado del pedido cambia solo por eso. Las páginas `/pago/exitoso`, `/pago/pendiente` y `/pago/fallido` **no marcan nada como pagado**: le preguntan al servidor.

`GET /orders/:id/payment?payment_id=…` hace la misma consulta al proveedor que el webhook. Sirve cuando el aviso todavía no llegó y, en desarrollo, cuando no hay URL pública.

## Quién puede pagar un pedido

Quien tiene sesión y es dueño del pedido, o el invitado que presenta el token del pedido (`X-Order-Token`, ver 9.2). Para cualquier otra persona, el pedido "no existe" (404).

## Estados (`orders.payment_status`)

| Estado | Significado | Sale hacia |
|---|---|---|
| `pending` | Sin pago confirmado | `paid`, `failed`, `canceled` |
| `failed` | El último intento fue rechazado o cancelado; se puede reintentar | `pending`, `paid`, `canceled` |
| `paid` | Pago aprobado | `refunded` |
| `canceled` | Venció sin pago; stock y cupón devueltos | `paid_after_cancel` |
| `refunded` | Devuelto o contracargo | — |
| `paid_after_cancel` | Se aprobó un pago después del vencimiento: requiere revisión manual | — |

`orders.status` sigue siendo el estado logístico. Solo cambia a `canceled` cuando el pago vence.

| Mercado Pago | Efecto |
|---|---|
| `approved` | `paid` (o `paid_after_cancel` si el pedido ya venció) |
| `rejected`, `cancelled` | `failed`, salvo que el pedido ya esté pagado o cancelado |
| `refunded`, `charged_back` | `refunded`, solo si estaba pagado |
| `pending`, `in_process`, `authorized`, `in_mediation` | Sin cambios (un `failed` vuelve a `pending`) |

## Stock

Orders descuenta el stock al crear el pedido, así que el stock queda reservado mientras se paga. Un pago rechazado **no** lo devuelve, porque se puede reintentar. Cada pedido tiene `payment_expires_at` (`PAYMENT_EXPIRATION_HOURS`, 48 por defecto). Una tarea periódica cancela los vencidos, devuelve el stock y descuenta el uso del cupón, todo en una transacción. La preferencia vence al mismo tiempo.

## Idempotencia

Un mismo aviso repetido no duplica nada:
- `payments.transaction_ref` (id del proveedor) es único.
- Se procesa con la fila del pedido bloqueada, así que dos avisos simultáneos van en fila.
- Si el pago ya tiene ese estado, no se hace nada.

## Discrepancia de monto o moneda

Se registra el pago como `amount_mismatch`, **no** se marca el pedido como pagado y se deja un aviso en el log, solo con ids.

## Tabla `payments`

Una fila por pago del proveedor: `transaction_ref`, `status`, `amount`, `currency`, `method`, `paid_at` y referencia al pedido. No se guardan los payloads, que traen datos personales del pagador.

## Configuración

| Variable | Uso |
|---|---|
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciales de prueba. Las dos o ninguna: si falta una, la API no arranca. |
| `MP_PUBLIC_API_URL`, `MP_PUBLIC_FRONTEND_URL` | URLs públicas HTTPS para el webhook y los retornos (Mercado Pago no acepta `localhost`). Obligatorias si hay credenciales. |
| `PAYMENT_CURRENCY` | Moneda de las preferencias y de la validación. Por defecto `UYU`. |
| `PAYMENT_EXPIRATION_HOURS` | Vencimiento del pago. Por defecto 48. |
| `PAYMENTS_SIMULATED` | Solo desarrollo y tests: proveedor simulado, sin salir a internet. |

- **Sin credenciales, Payments queda deshabilitado con un aviso** y el checkout sigue como antes: se registra el pedido y se coordina el pago. Es lo más seguro, porque la tienda sigue andando sin inventar cobros.
- **En `NODE_ENV=production` la API no arranca con Payments activo**, porque es un proyecto de práctica.

## Cómo probar

**Sin internet (lo que corre hoy):** los tests (`test/payments.e2e-spec.ts`) cubren firma, idempotencia, discrepancia de monto, ownership, vencimiento y reintento. Para probar a mano, levantá la API con `PAYMENTS_SIMULATED=true` y `MP_WEBHOOK_SECRET=<un secreto>`, y mandá eventos firmados:

```bash
pnpm payments:simulate <idPedido> approved    # también: pending, rejected, mismatch
```

**De punta a punta con Mercado Pago (cuando lo decidas):** seguí [`mercadopago-prueba.md`](./mercadopago-prueba.md): credenciales de prueba, cuentas de prueba, un túnel temporal hacia el front (Vite reenvía `/api`), el webhook y su clave, `pnpm payments:check` para revisar la configuración sin conectarse, la compra con las tarjetas de prueba oficiales, qué comprobar y cómo volver al modo simulado.
