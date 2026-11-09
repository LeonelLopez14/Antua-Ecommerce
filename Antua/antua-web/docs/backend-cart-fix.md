# Arreglos pendientes del carrito en antua-api

Este documento explica por qué el drawer del carrito de antua-web no puede funcionar con el backend actual y qué cambiar en `antua-api/src/cart` para que funcione. Los números de línea corresponden al commit `f338c48d`.

> **Estado (16/10/2026): aplicado en `antua-api`.** Ver la sección [Cambios aplicados](#cambios-aplicados) al final, con los archivos y líneas resultantes y las pruebas. Las secciones B1 a B4 quedan como explicación del diagnóstico; sus números de línea son los del commit `f338c48d`, previos al arreglo.

## Qué espera el front

Todas las respuestas de `/cart` deberían tener la misma forma:

```json
{
  "cart": {
    "id": 4,
    "guest_token": "9c58dea3-…",
    "coupon": null,
    "items": [
      {
        "id": 1,
        "quantity": 1,
        "unit_price_snapshot": "12960.00",
        "variant": {
          "id": 2, "name": "x6", "price": "12960.00", "stock": 15,
          "product": { "id": 1, "name": "Clásica con chips", "slug": "…", "images": [ … ] }
        }
      }
    ]
  },
  "summary": { "subtotal": 12960, "discount": 0, "total": 12960 }
}
```

El front reemplaza su estado con esta respuesta y **nunca** calcula montos. Por eso, si falta `items` o `summary`, no puede mostrar nada correcto.

En `cart.service.ts` ya hay dos piezas que hacen casi todo el trabajo:

- `findCartWithItems(cartId)` (línea 380): busca el carrito con sus ítems y su cupón.
- `getSummary(cart)` (línea 394): calcula subtotal, descuento y total.

La idea de los arreglos es usar **siempre** esas dos juntas.

---

## B1: `GET /cart` devuelve el carrito sin ítems ni totales

**Dónde:** `cart.controller.ts`, líneas 28 a 36 (`cart()`) y líneas 112 a 126 (`resolveCart`).

**Causa:** `cart()` devuelve directamente lo que devuelve `resolveCart`, que a su vez devuelve lo que devuelve `getOrCreateCart` (`cart.service.ts`, línea 29). Esa función busca el carrito con `findOne({ where: … })` **sin `relations`**.

En TypeORM, las relaciones (`items`, `coupon`) no se cargan solas: si no las pedís en `relations`, la propiedad directamente no aparece en el objeto. Por eso la respuesta es solo:

```json
{ "id": 3, "guest_token": "4e7ca3e4-…" }
```

**Síntoma en el front:** al recargar la página no se sabe qué hay en el carrito. El contador de la Navbar queda en 0 y en la consola aparece `[cart] GET /cart devolvió una forma inesperada`.

**Cambio mínimo:**

1. En `cart.service.ts`, agregá un método público que arme la respuesta completa. Podés ponerlo junto a `getCartWithItems`, al final del archivo:

   ```ts
   async getCartResponse(cartId: number) {
     const cart = await this.findCartWithItems(cartId);
     if (!cart) {
       throw new NotFoundException('Carrito no encontrado.');
     }
     return {
       cart,
       summary: this.getSummary(cart),
     };
   }
   ```

2. En `cart.controller.ts`, hacé que `cart()` lo use. `resolveCart` se sigue llamando porque es la que crea el carrito y pone el header `X-Guest-Token`:

   ```ts
   async cart(/* …mismos parámetros… */) {
     const cart = await this.resolveCart(req, guestToken, res);
     return this.cartService.getCartResponse(cart.id);
   }
   ```

**Cómo probarlo:**

```bash
# 1) Pedí un carrito nuevo y guardá el token que devuelve el header
T=$(curl -si localhost:3000/cart | grep -i '^x-guest-token' | cut -d' ' -f2 | tr -d '\r')

# 2) Volvé a pedirlo con el token: tiene que traer items y summary
curl -s localhost:3000/cart -H "X-Guest-Token: $T"
# → {"cart":{"id":…,"coupon":null,"items":[]},"summary":{"subtotal":0,"discount":0,"total":0}}
```

---

## B2: `POST /cart/items` devuelve formas distintas según el caso

**Dónde:** `cart.service.ts`, `addItem` (línea 86). Se ve comparando la línea 145, que devuelve `{ cart, summary }`, con la línea 161, que devuelve solo `findCartWithItems(...)`.

**Causa:** `addItem` tiene dos caminos:

- Si la variante **ya estaba** en el carrito, suma la cantidad y devuelve `{ cart, summary }` (líneas 145 a 148).
- Si es una variante **nueva**, crea el ítem y devuelve `this.findCartWithItems(cart.id)` (línea 161), es decir, el carrito **sin `summary`**.

**Síntoma en el front:** la primera vez que agregás un producto, el front recibe un carrito sin totales y muestra el error "No pudimos cargar el detalle de tu carrito". La segunda vez que agregás la misma variante funciona.

**Cambio mínimo:** en la línea 161, reemplazá

```ts
return this.findCartWithItems(cart.id);
```

por

```ts
return this.getCartResponse(cart.id);
```

Si querés, también podés reemplazar el bloque de las líneas 134 a 148 por `return this.getCartResponse(cart.id);`, que hace lo mismo y es más corto.

> **Mismo problema en `mergeCarts`:** las líneas 316 y 332 devuelven `this.getOrCreateCart(userId)`, que es el carrito sin ítems ni summary. Cuando exista el login, el front va a llamar a `POST /cart/merge`, así que conviene cambiarlas por:
>
> ```ts
> const cart = await this.getOrCreateCart(userId);
> return this.getCartResponse(cart.id);
> ```

**Cómo probarlo** (con el `$T` de B1):

```bash
# Elegí una variante (acá, la x6 de un producto de prueba)
V=$(curl -s localhost:3000/products/seed-clasica-chips \
  | python3 -c "import json,sys;print([v['id'] for v in json.load(sys.stdin)['variants'] if v['name']=='x6'][0])")

# Primera vez (ítem nuevo): ANTES no traía summary, AHORA sí
curl -s -X POST localhost:3000/cart/items \
  -H 'Content-Type: application/json' -H "X-Guest-Token: $T" \
  -d "{\"variantId\":$V,\"quantity\":1}"
# → {"cart":{…},"summary":{"subtotal":12960,"discount":0,"total":12960}}
```

---

## B3: los ítems no traen el producto (ni nombre ni imagen)

**Dónde:** `cart.service.ts`, `findCartWithItems`, líneas 380 a 392. El problema está en el bloque `relations` (líneas 385 a 390).

**Causa:** la relación se pide solo hasta la variante:

```ts
relations: {
  items: {
    variant: true,
  },
  coupon: true,
},
```

Pasa lo mismo que en B1: TypeORM carga **solo** las relaciones que le pedís. La variante tiene un `@ManyToOne` hacia `Product` (`product-variant.entity.ts`, línea 26), pero como no lo incluís, `variant.product` no viene.

**Síntoma en el front:** el drawer no puede mostrar el nombre ni la foto del producto, solo "x6" y el precio. No se puede armar el link a la ficha porque falta el `slug`.

**Cambio mínimo:** anidá la relación hasta el producto y sus imágenes.

```ts
relations: {
  items: {
    variant: {
      product: {
        images: true,
      },
    },
  },
  coupon: true,
},
```

Con objetos anidados, TypeORM hace los JOIN en cadena: ítems → variante → producto → imágenes. Como todas las respuestas pasan por `findCartWithItems`, este único cambio arregla todos los endpoints.

**Cómo probarlo:** la misma request de B2. Ahora cada ítem trae `variant.product.name`, `variant.product.slug` y `variant.product.images`.

```bash
curl -s localhost:3000/cart -H "X-Guest-Token: $T" \
  | python3 -c "import json,sys;i=json.load(sys.stdin)['cart']['items'][0];print(i['variant']['product']['name'], len(i['variant']['product']['images']))"
# → Clásica con chips 3
```

---

## B4: el resumen no incluye el envío

**Dónde:** `cart.service.ts`, `getSummary`, líneas 394 a 418.

**Causa:** no es un bug: el backend todavía no tiene el concepto de envío. `getSummary` devuelve solo `{ subtotal, discount, total }`.

**Síntoma en el front:** el drawer no puede mostrar un costo de envío. Por la regla de no calcular montos en el cliente, por ahora muestra "Envío: se calcula en el checkout", y el total no lo incluye.

**Cambio recomendado** (cuando se defina el checkout): según DESIGN.md, el envío es **único y fijo**. Lo más simple es:

1. Agregá una variable `SHIPPING_COST` al `.env` y leela con `ConfigService` en `CartService`. Así el precio no queda escrito en el código.
2. En `getSummary`, sumá el envío al total y devolvelo:

   ```ts
   const shipping = cart.items.length > 0 ? this.shippingCost : 0;
   const total = Math.max(subtotal - discount, 0) + shipping;
   return { subtotal, discount, shipping, total };
   ```

Cuando `summary.shipping` exista, el front lo muestra sin más cambios de lógica.

**Cómo probarlo:** `GET /cart` con ítems tiene que devolver `summary.shipping` y un `total` igual a `subtotal - discount + shipping`.

---

## Otros hallazgos (fuera de B1 a B4)

- **La API no arranca:** `AuthModule` no puede inyectar `UsersService` (`UnknownDependenciesException`). En `src/users/users.module.ts`, `exports` tiene que incluir el servicio: `exports: [UsersService, TypeOrmModule]`. En NestJS, un módulo solo puede usar los providers que otro módulo **exporta**. Exportar `TypeOrmModule` comparte el repositorio, pero no el servicio.
- **CORS en producción:** `main.ts` no llama a `app.enableCors()`. En desarrollo no importa por el proxy de Vite, pero en producción hace falta y además hay que exponer el header del invitado. Si no, el navegador no deja leerlo:

  ```ts
  app.enableCors({ origin: ['https://tu-dominio'], exposedHeaders: ['X-Guest-Token'] });
  ```

- **Cupón con monto mínimo:** el mínimo (`min_order_amount`) se valida solo al aplicar el cupón (línea 266). Si después se quitan ítems y el subtotal queda debajo del mínimo, el descuento sigue aplicado. Conviene revalidarlo en `getSummary`, o quitar el cupón en `updateItem` y `removeItem`.
- **Reviews públicas con email:** `GET /products/:slug/reviews` devuelve el usuario completo, con email. Conviene limitar los campos, por ejemplo con `select: { user: { id: true, full_name: true } }` en el `find`.

---

## Cambios aplicados

| Bug | Archivo y línea (después del cambio) | Qué cambió |
|---|---|---|
| — | `src/users/users.module.ts:11` | `exports: [UsersService, TypeOrmModule]`. Sin esto la API no arrancaba; lo aprobaste aparte. |
| B1 | `src/cart/cart.controller.ts:35-36` | `GET /cart` llama a `resolveCart` (que crea el carrito y pone el header) y después devuelve `getCartResponse(cart.id)`. |
| B1/B2 | `src/cart/cart.service.ts:433` | Nuevo método público `getCartResponse(cartId)`: carga el carrito con `findCartWithItems` y devuelve `{ cart, summary }`. Es el único lugar que arma la respuesta. |
| B2 | `cart.service.ts:136` y `:149` | Los dos caminos de `addItem` (ítem existente y nuevo) devuelven `getCartResponse`. Se borró el bloque repetido. |
| B2 (mismo patrón) | `cart.service.ts:305` y `:322` | `mergeCarts` ya no devuelve el carrito pelado cuando no hay token o carrito de invitado. |
| B3 | `cart.service.ts:376-381` | `findCartWithItems` carga `items → variant → product → images`. |
| B4 | `cart.service.ts:15`, `:28`, `:404-431` | `CartService` recibe `ConfigService`. `getSummary` limita el descuento al subtotal (igual que `orders.service.ts`), suma el envío y devuelve `shipping`. `getShippingAmount` lee `SHIPPING_FLAT_RATE`, **la misma variable que ya usaba `orders.service.ts`**: devuelve 0 si el carrito está vacío y `null` si la variable no está definida (el front muestra "se calcula en el checkout"). |

**Pruebas hechas contra tu API** (scripts en el scratchpad de la sesión):

- Invitado y usuario logueado: crear carrito, agregar variante nueva, sumar la misma, `PATCH` de cantidad, cupones `SEED10` (−10 %), `SEEDFIJO` (−$1000) y `SEEDVENCIDO` (400 "El cupon ha expirado o aun no vigente."), quitar cupón, quitar ítem y `GET /cart`. Todas las respuestas tienen `{ cart: { items: [... variant.product ...] }, summary }`.
- B4 con `SHIPPING_FLAT_RATE=1500` (solo en el entorno, sin tocar `.env`): vacío → `shipping: 0`; con un ítem de $2500 → `{ subtotal: 2500, discount: 0, shipping: 1500, total: 4000 }`; con `SEEDFIJO` → `total: 3000`.
- `pnpm build`: OK.

## Pendientes que encontré y NO toqué

> **Actualización 17/10/2026:** los seis puntos de esta lista quedaron resueltos. El detalle está en [`progreso.md`](./progreso.md).

1. **`SHIPPING_FLAT_RATE` no está en `.env`.** El carrito devuelve `shipping: null`, pero `orders.service.ts:154-156` hace `Number(undefined)` = `NaN` y el total de la orden queda `NaN`. Hay que definir el valor (decisión de negocio).
2. **Tests:** 16 de 20 suites fallan antes de correr porque Jest no resuelve los imports absolutos `src/...`. Falta `"moduleNameMapper": { "^src/(.*)$": "<rootDir>/$1" }` en la config de Jest de `package.json`. Además, los specs generados (`cart.service.spec.ts`, etc.) no mockean los repositorios, así que van a fallar por inyección de dependencias aunque se arregle el mapper.
3. **`mergeCarts` sin transacción** (`cart.service.ts:333-356`): si a mitad del bucle una variante no tiene stock, tira la excepción con algunos ítems ya movidos al carrito del usuario y el carrito de invitado sin borrar. Conviene envolverlo en `dataSource.transaction(...)`.
4. **Cupón con mínimo:** se valida solo al aplicarlo (`applyCoupon`). Si después bajás la cantidad o quitás ítems, el cupón sigue aplicado aunque el subtotal quede debajo del mínimo; `orders.service.ts` sí lo revalida al crear la orden, así que el usuario ve el error recién ahí.
5. **`addItem` valida la variante activa pero no el producto** (`is_active` del producto): se puede agregar una variante de un producto inactivo.
6. **`mergeCarts` pierde los ítems si el carrito de invitado tiene cupón** (`cart.service.ts:352-355`). Lo encontré en la prueba de punta a punta y lo confirmé con curl: invitado con un ítem + `SEED10` → `POST /cart/merge` → el usuario queda con `items: []` y en la base hay filas de `cart_items` con `cartId = NULL`.
   - **Por qué:** `fullUserCart` se cargó *antes* de mover los ítems, así que su propiedad `items` es la lista vieja (vacía en un usuario nuevo). Al hacer `this.cartRepository.save(fullUserCart)` para copiar el cupón, TypeORM compara esa lista con la base, ve ítems que "ya no están" y les pone `cartId = NULL` (en las relaciones `OneToMany`, por defecto `orphanedRowAction` es `nullify`).
   - **Arreglo mínimo:** actualizar solo la columna del cupón, sin pasar por las relaciones:
     ```ts
     if (!fullUserCart.coupon && guestCart.coupon) {
       await this.cartRepository.update(fullUserCart.id, { coupon: { id: guestCart.coupon.id } });
     }
     ```
     `update()` genera un `UPDATE carts SET couponId = ? WHERE id = ?` y no toca `cart_items`.
   - **Cómo probarlo:** carrito de invitado con un ítem → `POST /cart/coupon {"couponCode":"SEED10"}` → registrar usuario → `POST /cart/merge` con `Authorization` y `X-Guest-Token`. La respuesta tiene que traer el ítem y el cupón.
