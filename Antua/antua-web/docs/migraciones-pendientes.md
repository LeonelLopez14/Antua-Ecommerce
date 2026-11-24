# Migraciones pendientes

Hay dos migraciones propuestas. Ninguna está aplicada en ninguna base real. Viven en `antua-api/src/database/proposed/`, fuera de `migrations/`, así que `migration:run` no las ve. **Las aplicás vos**, después de leerlas.

| Migración | Qué cambia | Bloqueo | Tiempo medido* | `down` |
|---|---|---|---|---|
| `1794900000000-OrdersIndexes` (Fase 13) | 3 índices en `orders` | Ninguno: índice en línea (lecturas y escrituras siguen) | 2,3 s en total | Sí, probado |
| `1795000000000-ProductsUpdatedAt` (Fase 16) | Columna `products.updated_at` | Ninguno: `ALGORITHM=INSTANT` | 0,02 s + 0,02 s del relleno | Sí, probado |

\* Base de prueba con 200.000 pedidos, 5.000 usuarios, 300 productos y 3.000 entradas de auditoría, en MySQL 8.4.13 (Docker en una PC de desarrollo). Detalle abajo.

## Cómo se midió

- **Base:** `antua_test`, en un contenedor aparte (`antojarte-f16-mysql`, puerto 3317). No se usó la base de desarrollo (`antua-mysql`) ni ninguna otra.
- **Esquema:** se armó solo con las 8 migraciones aplicadas.
- **Datos:**
  - 200.000 pedidos repartidos en dos años: 30 % de invitados, los cinco estados por igual;
  - los pagos vencidos viejos ya cancelados, como los deja la tarea de vencimiento;
  - 165 pedidos pendientes con el pago vencido.
- **Consultas:** las mismas que arma el código. El `EXPLAIN ANALYZE` se corrió antes y después de aplicar cada migración.
- **Verificación automática:** `antua-api/test/proposed-migrations.e2e-spec.ts` aplica el `up` y el `down` de las dos migraciones, solo contra `antua_test`. Comprueba que el `down` deja los índices y las columnas exactamente como estaban. Corre en CI con el resto de los e2e.

## 1. OrdersIndexes: índices en `orders`

**Qué hace.** Crea tres índices:

- `IDX_orders_user_created (userId, created_at)`;
- `IDX_orders_created (created_at)`;
- `IDX_orders_status_payment (status, payment_status, payment_expires_at)`.

No toca datos ni columnas.

**Por qué.** Tres consultas frecuentes no tienen un índice que les sirva.

**Evidencia** (`EXPLAIN ANALYZE`, 200.000 pedidos):

| Consulta (dónde está en el código) | Antes | Después |
|---|---|---|
| Mis pedidos: `WHERE userId = ? ORDER BY created_at DESC LIMIT 20` (`orders.service.ts`) | Índice de la FK, después **ordena en memoria** (`Sort`), 0,12 ms | `IDX_orders_user_created` en orden inverso, sin `Sort`, 0,09 ms |
| Panel, rango de fechas: `created_at >= ? AND created_at < ?` (`admin-orders.service.ts`) | **Recorre la tabla entera** (200.000 filas) y ordena: 60 ms | Rango sobre `IDX_orders_created`, lee 25 filas: 4 ms |
| Vencimiento de pagos, cada 10 minutos: `status`, `payment_status IN (…)`, `payment_expires_at < ahora` (`payment-expiration.service.ts`) | **Recorre la tabla entera**: 59 ms | Rango sobre `IDX_orders_status_payment`, solo el índice (*covering*): 0,6 ms |

"Mis pedidos" casi no cambia en tiempo, porque un cliente tiene pocos pedidos. Lo que se gana es no ordenar en memoria. Las otras dos consultas crecen con la tabla: hoy tardan poco porque la base de producción es chica, pero con el volumen de la prueba ya son 15 y 100 veces más lentas.

**Riesgo.** Bajo.

- **Espacio:** cada índice ocupa espacio en disco, unos pocos MB con 200.000 pedidos.
- **Escritura:** cada `INSERT` o `UPDATE` de un pedido actualiza tres índices más; es despreciable con este volumen.
- **El `down` original estaba roto** (corregido en esta fase). MySQL crea solo el índice de la FK de `userId`, y lo borra en silencio cuando aparece otro que sirve para la FK: el `(userId, created_at)`. Después, el `down` no podía borrar ese índice: `ERROR 1553: needed in a foreign key constraint`. Ahora el `down` recrea el índice de la FK si falta, y el e2e comprueba que los índices quedan iguales.

**Bloqueo esperado.** Ninguno que frene la tienda. Se probó que MySQL acepta crear los tres índices con `ALGORITHM=INPLACE, LOCK=NONE`, es decir, en línea: mientras se construyen, se puede leer y escribir en `orders`. Solo al principio y al final toma un bloqueo de metadatos de un instante. Si en ese momento hay una transacción larga abierta sobre `orders`, el `CREATE INDEX` espera a que termine, y mientras tanto las consultas nuevas también esperan. Aplicala en un momento tranquilo.

Tiempos medidos con 200.000 pedidos:

| Paso | Tiempo |
|---|---|
| Crear `IDX_orders_user_created` | 0,8 s |
| Crear `IDX_orders_created` | 0,64 s |
| Crear `IDX_orders_status_payment` | 0,84 s |
| `down`: borrar los tres índices | 0,02–0,03 s cada uno |
| `down`: recrear el índice de la FK si falta | 0,5 s |

**`down`.**

1. Borra `IDX_orders_status_payment` e `IDX_orders_created`.
2. Si falta, recrea `FK_151b79a83ba240b0cb31b2302d1 (userId)`, el índice de la FK.
3. Borra `IDX_orders_user_created`.

Se corre con `migration:revert`.

## 2. ProductsUpdatedAt: `products.updated_at`

**Qué hace.**

- **Agrega la columna** `updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`. Lo hace con `ALGORITHM=INSTANT`: si MySQL no pudiera agregarla al instante, la migración falla en vez de copiar la tabla.
- **La rellena:** cada producto toma la fecha de su último cambio registrado en la auditoría del panel.
  - Los productos que nunca se editaron desde el panel quedan con la fecha y hora en que se aplica la migración. Es el "valor por defecto sensato": no hay un dato mejor, y una fecha vacía obligaría a aceptar `NULL` para siempre.
  - Desde ahí, MySQL la actualiza sola en cada cambio de la fila (`ON UPDATE`).

**Por qué.** El sitemap (`/sitemap.xml`) informa a los buscadores la fecha de último cambio de cada producto (`lastmod`). Hoy la saca de la auditoría del panel. Eso no ve los cambios hechos por fuera del panel, como el seed o un `UPDATE` a mano.

**Qué hace el sitemap, con y sin la columna** (ya está en el código, `antua-api/src/seo/seo.controller.ts`):

- **Sin la columna**, como hoy: usa la auditoría. Si un producto no tiene ninguna entrada, sale sin `lastmod`.
- **Con la columna:** usa la fecha más reciente entre `updated_at` y la auditoría. La auditoría sigue contando porque registra también los cambios de variantes e imágenes, que no tocan la fila del producto.
- El sitemap pregunta en cada pedido si la columna existe. Por eso, al aplicar la migración, la usa sin reiniciar la API.

**Evidencia.**

- **Rendimiento:** con 300 productos, la consulta del sitemap tarda lo mismo con y sin la columna, unos 0,2 ms. Recorre `products`, que es chica, y busca en la auditoría por su índice `(entity, entity_id)`. La migración no se pide por rendimiento, sino por exactitud.
- **Relleno:** de 300 productos, 250 tomaron la fecha de la auditoría y 50 quedaron con la de la migración.
- **e2e:** el relleno, el sitemap con la columna, la actualización automática (`ON UPDATE`) y el `down`.

**Riesgo.** Bajo.

- **Entidad:** después de aplicarla hay que agregar la columna a la entidad (ver el paso 3 abajo). Si no, un `migration:generate` futuro propondría **borrarla**, porque la entidad no la conoce.
- **Límite de `INSTANT`:** MySQL admite hasta 64 cambios `INSTANT` por tabla antes de exigir que se reconstruya. Esta migración usa uno para agregar la columna y su `down` otro para quitarla.

**Bloqueo esperado.** Ninguno: `ALGORITHM=INSTANT` solo cambia el diccionario de datos, con un bloqueo de metadatos de un instante (0,02 s medido). El relleno es un `UPDATE` con bloqueo de fila sobre los productos editados: 250 filas en 0,02 s.

**`down`.** `ALTER TABLE products DROP COLUMN updated_at, ALGORITHM=INSTANT` (0,02 s). Se pierde la fecha registrada, pero no hay otro dato que dependa de ella.

## Respaldo previo y comando exacto

Primero, siempre, el respaldo. Se guarda **fuera del repo**.

### En producción (stack de `docker-compose.prod.yml`)

Con `DC` definido como en [despliegue.md](despliegue.md):

```bash
# 1. Respaldo, con etiqueta, y comprobá que se creó
BACKUP_TAG=antes-de-migrar ./scripts/backup-db.sh
ls -lh /var/backups/antojarte/ | tail -3

# 2. En tu copia del repo: mové las que decidas aplicar a migrations/, revisá y hacé el commit
git mv antua-api/src/database/proposed/1794900000000-OrdersIndexes.ts antua-api/src/database/migrations/
git mv antua-api/src/database/proposed/1795000000000-ProductsUpdatedAt.ts antua-api/src/database/migrations/

# 3. Solo si aplicás ProductsUpdatedAt, en el mismo commit, en antua-api/src/products/entities/product.entity.ts:
#      import { …, UpdateDateColumn } from 'typeorm';
#      @UpdateDateColumn({ type: 'datetime', precision: 6 })
#      updated_at: Date;
#    Y si aplicás OrdersIndexes, los @Index que indica el comentario de esa migración.

# 4. Construir, ver qué falta, aplicar (con el usuario de migraciones) y levantar
$DC build api
$DC run --rm migrate node node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
$DC run --rm migrate
$DC up -d
$DC ps                         # los tres (healthy)
```

El orden importa: construir, migrar y recién después levantar. Con migraciones pendientes, la API arranca igual: solo avisa en el log ("Hay migraciones pendientes"). Pero si la entidad ya tiene `updated_at` y la columna todavía no existe, las consultas de productos fallan. Mientras tanto, el contenedor viejo sigue atendiendo con la imagen anterior.

**Deshacer** la última migración aplicada (una por vez, de la más nueva a la más vieja):

```bash
$DC run --rm migrate node node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js
```

Después hay que volver el archivo a `proposed/` y quitar de la entidad lo que se agregó. Si algo sale mal a mitad de camino, lo más seguro es el respaldo: `./scripts/restore-db.sh <archivo> --force`. Ver "Actualizar a una versión nueva y volver atrás" en [despliegue.md](despliegue.md).

### En desarrollo (`antua-mysql`, puerto 3307)

```bash
# Respaldo fuera del repo (la contraseña la toma de adentro del contenedor)
docker exec antua-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines antua_db' > ~/respaldos/antua_db-antes-de-migrar.sql

cd antua-api
git mv src/database/proposed/<archivo>.ts src/database/migrations/
pnpm migration:show
pnpm migration:run
# para deshacer: pnpm migration:revert
```

Con `pnpm dev` corriendo, Nest se reinicia solo al mover el archivo. No aplica migraciones solo (`migrationsRun: false`).
