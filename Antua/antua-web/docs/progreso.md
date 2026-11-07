# Progreso

Registro de cambios por tanda. El estado general del front está en [`estado-frontend.md`](./estado-frontend.md).

## 17/10/2026: pendientes del backend antes de las Fases 5 a 8

Cambios en `antua-api`, autorizados solo para estos cuatro puntos. Sin commits.

### a) `SHIPPING_FLAT_RATE` obligatoria y sin totales `NaN`

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `.env` (línea 8) | La variable no existía. `POST /orders` hacía `Number(undefined)`, o sea `NaN`, y guardaba un total `NaN`. | Se agregó `SHIPPING_FLAT_RATE=1500` (valor provisorio elegido por el usuario). |
| `src/config/env.validation.ts` (nuevo) | Nada controlaba el `.env` al arrancar. | `validateEnv` exige que `SHIPPING_FLAT_RATE` sea un número ≥ 0 y la convierte a `number`. Si falta, está vacía, es texto o es negativa, la API **no arranca** y muestra: `SHIPPING_FLAT_RATE es obligatoria y tiene que ser un número mayor o igual a 0 (recibido: "abc"). Definila en antua-api/.env…`. |
| `src/app.module.ts:20` | `ConfigModule.forRoot` solo leía el `.env`. | Ahora le pasa `validate: validateEnv`. Nest corre esa función antes de crear cualquier módulo. |
| `src/orders/orders.service.ts:156-165` | `Number(config.get(...))` podía ser `NaN`. | Usa `getOrThrow<number>` (ya validado) y, antes de crear la orden, verifica que subtotal, descuento, envío y total sean números finitos. Si no, responde 500 en vez de guardar basura. |
| `src/cart/cart.service.ts:399-410` | El envío era `null` cuando faltaba la variable. | Siempre es un número: 0 con el carrito vacío o la tarifa fija. Tiene el mismo control de números finitos que las órdenes. |
| `.env.example` (nuevo) | No existía. | Lista todas las variables, con `SHIPPING_FLAT_RATE` explicada. |

### b) Carrito

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `cart.service.ts:326-331` | **Merge con cupón perdía los ítems.** `save(fullUserCart)` llevaba la lista de ítems leída *antes* de mover los del invitado. TypeORM la comparaba con la base, creía que los ítems nuevos "sobraban" y les ponía `cartId = NULL`. | Se usa `update(id, { coupon })`, que escribe solo la columna del cupón y no mira los ítems. |
| `cart.service.ts:291-334` | **Merge sin transacción.** Si fallaba a mitad (por ejemplo, por stock), algunos ítems quedaban movidos y otros no. | Todo el merge corre dentro de `manager.transaction(...)`: o se aplica entero o no se aplica nada, y el invitado conserva su carrito. |
| `cart.service.ts:358-380` y `:421-430` | **El mínimo del cupón no se revalidaba.** Se aplicaba `SEED10` (mínimo $5000) y después se podía bajar el carrito a $2400 sin perder el descuento. `POST /orders` lo rechazaba recién al pagar. | `syncCoupon` corre en cada respuesta del carrito (`getCartResponse`): si el subtotal queda por debajo del mínimo, quita el cupón. `applyCoupon` usa la misma regla (`meetsCouponMinimum`). |
| `cart.service.ts:89-101` | **Se podían agregar productos inactivos**: solo se miraba `variant.is_active`, no el producto. | `addItem` también exige `product.is_active = true`. |
| `cart.service.ts:156-194` | Lo mismo al cambiar la cantidad. | `updateItem` no deja **sumar** unidades de algo inactivo; sí deja bajar la cantidad o quitarlo. |
| `cart.service.ts:197-262` | `updateItem`, `removeItem`, `applyCoupon` y `removeCoupon` repetían el armado de la respuesta, y `applyCoupon`/`removeCoupon` usaban `save()` con el carrito entero (el mismo riesgo del merge). | Todos devuelven `getCartResponse` y escriben el cupón con `update()`. `removeItem` borra con un solo `delete` filtrado por carrito. |

### c) Jest

| Archivo | Qué fallaba | Qué cambió |
|---|---|---|
| `package.json` (`jest.moduleNameMapper`) | 16 de 20 suites no arrancaban: Jest no entendía los imports `src/...`. | `"^src/(.*)$": "<rootDir>/$1"`. Así las 20 suites corren. |
| 16 `*.spec.ts` | Una vez resueltos los imports, fallaban porque los specs que generó el CLI no declaraban sus dependencias (repositorios, servicios). | `.useMocker(() => ({}))`: Nest pone un mock vacío en cada dependencia. Las pruebas siguen verificando lo mismo (que la clase se construye). Ninguna se borró ni se comentó. |

Resultado: **20 de 20 suites pasan.** Son pruebas mínimas: no cubren la lógica del carrito.

### d) `GET /products/:slug` sin inactivos

`products.service.ts:38`: `findOne` filtra `is_active: true`. Un producto inactivo responde 404, igual que uno inexistente (antes lo devolvía y el front lo ocultaba por su cuenta).

### Verificación

- `pnpm build`, `eslint` y `jest`: OK (20 de 20).
- curl contra la API del usuario (script `verify-fixes.sh` del scratchpad):
  - Carrito vacío: envío 0. Con un ítem de $2400: `{ subtotal: 2400, shipping: 1500, total: 3900 }`.
  - Variante de `seed-inactivo`: 404 "El producto no fue encontrado o esta inactivo."
  - `SEED10` sobre $7200 da −$720. Al bajar a $2400 el cupón se quita solo.
  - `SEEDVENCIDO`: 400. `SEEDFIJO`: −$1000.
  - Quitar un ítem inexistente: 404.
  - Invitado con 3 ítems + `SEED10` → registro → `POST /cart/merge`: el usuario queda con los 3 ítems y el cupón.
  - Merge que falla por stock: ni el carrito del usuario ni el del invitado cambian.
  - `GET /products/seed-inactivo`: 404. `seed-clasica-chips`: 200.
- La API no arranca con `SHIPPING_FLAT_RATE` en `abc`, vacía o `-5`, y muestra el mensaje de arriba.

### Hallazgos sin tocar

1. **`POST /orders` cobra el precio actual de la variante, no `unit_price_snapshot`** (`orders.service.ts:90`). Si un precio cambia entre agregar y pagar, el carrito y el pedido muestran montos distintos. Es una decisión de negocio: hay que definir qué precio manda.
2. **El cupón se quita en silencio** cuando el subtotal baja del mínimo. El front simplemente deja de mostrarlo. Si se quiere avisar ("Quitamos SEED10 porque el pedido no llega a $5000"), hay que agregar un campo a la respuesta.
3. **`seed.sql` y `seed-cleanup.sql` ya no están en el scratchpad.** Los datos sembrados siguen en la base. Si se necesitan otra vez, hay que regenerarlos y guardarlos en `antua-api/seed/`.
