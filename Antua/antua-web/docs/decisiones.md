# Decisiones técnicas

Registros breves de las decisiones que dan forma al proyecto. Cada uno tiene:
- **Contexto:** qué problema había.
- **Decisión:** qué se eligió.
- **Descartado:** qué alternativa no se eligió y por qué.
- **Consecuencias:** qué implica.

El detalle de cómo se implementó está en [progreso.md](progreso.md), por fase.

## 1. NestJS + TypeORM + MySQL

- **Contexto:** una API de comercio con usuarios, pedidos, pagos, roles y un panel, escrita por una sola persona que viene de TypeScript en el front.
- **Decisión:** NestJS 11 con TypeORM y MySQL 8.4.
  - Nest da módulos, inyección de dependencias, guards, pipes de validación y testing integrados, con convenciones que se repiten en cada módulo (`controller`, `service`, `dto/`, `entities/`).
  - MySQL porque los datos son relacionales (pedido → ítems → variante → producto), necesitan transacciones y bloqueos de fila, y es lo más común en hostings económicos.
- **Descartado:**
  - **Express "a mano":** cada pieza (validación, auth, roles) habría que armarla y probarla aparte.
  - **Prisma:** buena experiencia, pero en su momento sus bloqueos de fila (`SELECT … FOR UPDATE`) pedían SQL crudo, y el stock depende de eso.
  - **MongoDB:** los pedidos y el stock son transaccionales y con relaciones; un documento no aporta nada y complica la consistencia.
- **Consecuencias:**
  - TypeORM exige cuidado con `migration:generate` (ver la 7).
  - Los decimales llegan como texto desde MySQL y hay que convertirlos a número al calcular.

## 2. Snapshots de precio

- **Contexto:** un precio puede cambiar entre que alguien agrega una galleta al carrito y paga. Y un pedido viejo tiene que seguir mostrando lo que se cobró, aunque el producto cambie de nombre o se borre.
- **Decisión:**
  - **En el carrito:** cada ítem guarda `unit_price_snapshot`, el precio al agregarlo. Al confirmar, si el precio actual es otro, el pedido **no se crea**: la API responde 409 `PRICE_CHANGED` con los precios nuevos, actualiza el carrito y el front pide confirmar.
  - **En el pedido:** cada ítem guarda `product_name_snapshot` y `unit_price_snapshot`.
  - **Montos:** todos los calcula el servidor. El front nunca manda un total.
- **Descartado:**
  - **Cobrar en silencio el precio nuevo:** sorpresa para la persona.
  - **Respetar el precio viejo:** un error de carga en el panel se vendería al precio equivocado.
  - **Leer el precio del producto al mostrar el pedido:** el historial cambiaría solo.
- **Consecuencias:** una tabla de ítems algo más ancha, y un paso extra en el checkout cuando un precio cambió (raro, y explícito).

## 3. Token de invitado

- **Contexto:** se puede comprar sin cuenta. El carrito del invitado y su pedido necesitan un dueño, pero no hay sesión, y el email no está verificado.
- **Decisión:** dos tokens aleatorios distintos.
  - **Carrito:** un UUID que viaja en la cabecera `X-Guest-Token`. Al iniciar sesión, el carrito se fusiona con el de la cuenta.
  - **Pedido:** uno de 256 bits, entregado una sola vez. En la base queda solo su hash SHA-256, se compara en tiempo constante y viaja en `X-Order-Token` (nunca en la URL). Sirve para ver el pedido y para vincularlo a una cuenta una sola vez, dentro de las 24 h.
- **Descartado:**
  - **Vincular pedidos por email:** cualquiera podría registrarse con un email ajeno y quedarse con los pedidos de otra persona (está prohibido a propósito, y lo prueba un test).
  - **Ver el pedido con id + email:** los ids son consecutivos.
  - **Una cookie:** el front y la API pueden estar en orígenes distintos, y el resto de la API ya usa cabeceras.
- **Consecuencias:**
  - Si el invitado pierde el link del correo, pierde el acceso al pedido (se resuelve por soporte).
  - El link para ver el pedido no vence: se acepta como un link de seguimiento (ver [seguridad.md](seguridad.md), hallazgo 14).

## 4. Transacciones y bloqueos de stock

- **Contexto:** dos personas pueden comprar la última galleta al mismo tiempo. Un pedido toca stock, cupón, carrito y pagos.
- **Decisión:**
  - **Crear un pedido es una sola transacción.** Cada variante se lee con `SELECT … FOR UPDATE` (`pessimistic_write`), se verifica el stock y se descuenta. Si algo falla, no queda nada a medias.
  - **El stock se reserva al crear el pedido**, no al pagar. Un pago rechazado no lo devuelve (se puede reintentar).
  - **Los pagos vencidos** (48 h) los cancela una tarea periódica, que devuelve stock y cupón en otra transacción.
  - **Los avisos de pago** se procesan con la fila del pedido bloqueada: dos avisos simultáneos no se pisan.
- **Descartado:**
  - **Bloqueo optimista** (versión y reintento): con picos de compra de un mismo producto, los reintentos se multiplican.
  - **Descontar al pagar:** se vendería más de lo que hay mientras alguien está en Mercado Pago.
  - **Una cola:** demasiada infraestructura para este volumen.
- **Consecuencias:** las compras simultáneas de una misma variante esperan en fila unos milisegundos, y el stock reservado por pedidos sin pagar no se vende durante 48 h.

## 5. Roles en la base, no claves compartidas

- **Contexto:** el panel empezó protegido con una clave compartida (`X-Admin-Key`). No dice quién hizo qué, no se puede revocar para una sola persona y termina copiada en lugares inseguros.
- **Decisión:**
  - **Un rol `admin` en el usuario**, leído de la base en cada request: quitarlo corta el acceso con el mismo token.
  - **Denegar por defecto:** toda ruta `/admin` sin `@Roles` responde 403, y un test recorre todas las rutas registradas para verificarlo.
  - **Nadie se vuelve admin desde la web:** el primer admin se crea en el servidor (`pnpm admin:create`).
  - **Auditoría:** cada acción del panel deja una entrada (quién, qué y cuándo, sin datos sensibles).
- **Descartado:**
  - **El rol dentro del JWT:** no se podría revocar hasta que venza.
  - **Un sistema de permisos finos:** hay un solo tipo de administrador.
- **Consecuencias:** una consulta extra por request autenticada (por id, indexada).

## 6. CSP estricta y Caddy

- **Contexto:** en producción hacen falta HTTPS, archivos estáticos con buena caché, compresión, cabeceras de seguridad y un proxy hacia la API, con poca configuración para mantener.
- **Decisión:**
  - **Caddy** sirve el front compilado y reenvía `/api`. Obtiene y renueva el certificado solo, y comprime con zstd o gzip.
  - **CSP sin `unsafe-inline` ni `unsafe-eval`** (`script-src 'self'`, `frame-ancestors 'none'`). Por eso el script que aplica el tema antes de pintar es un archivo aparte (`public/theme-init.js`) y no hay estilos ni scripts en línea.
  - **Las cabeceras se verifican** con `scripts/check-headers.sh`.
- **Descartado:**
  - **Nginx + certbot:** más piezas y más configuración para lo mismo.
  - **Servir el front desde Nest:** mezcla responsabilidades y pierde la caché y la compresión de un servidor de archivos.
  - **Una CSP con `unsafe-inline`:** quitaría la principal defensa si apareciera un XSS, justo porque el token vive en `localStorage`.
- **Consecuencias:** nada de scripts de terceros sin agregarlos a la CSP a propósito.

## 7. Migraciones explícitas

- **Contexto:** en la Fase 12, con `migrationsRun: true` y `pnpm dev` en modo watch, `migration:generate` escribió `DROP COLUMN` + `ADD COLUMN` para ampliar una columna. Llegó a la base en segundos y vació los ingredientes y alérgenos; se restauraron desde un respaldo.
- **Decisión:**
  - Esquema solo con migraciones (`synchronize: false`) y **nunca aplicadas solas** (`migrationsRun: false`).
  - Una migración se lee y recién después se aplica con `migration:run`. En producción, con un servicio aparte (`migrate`) y un usuario con permisos de esquema; la API usa uno que no puede alterar tablas.
  - Las migraciones propuestas viven en `src/database/proposed/`, con su análisis en [migraciones-pendientes.md](migraciones-pendientes.md).
- **Descartado:**
  - **`synchronize`:** puede borrar columnas al cambiar una entidad.
  - **Aplicar al arrancar:** es justo lo que causó la pérdida de datos.
- **Consecuencias:** un paso manual en cada despliegue con cambios de esquema. La API avisa en el log si falta alguna, y el seed se niega a correr.

## 8. Pagos con Mercado Pago Checkout Pro

- **Contexto:** la tienda está en Uruguay y cobra en pesos. Procesar tarjetas directamente exige cumplir PCI DSS.
- **Decisión:** **Checkout Pro**, la página de pago de Mercado Pago.
  - **Datos de tarjeta:** ninguno pasa por este sistema.
  - **Monto:** el pedido define el total y el cliente no manda ningún monto.
  - **Estado del pago:** lo cambia solo el servidor, con un webhook firmado (verificado con el validador del SDK oficial), la consulta del pago real al proveedor y la validación de monto y moneda. Las páginas de retorno (`/pago/exitoso`) no marcan nada: le preguntan al servidor.
  - **Credenciales:** solo se admiten las de prueba, y en producción los pagos quedan desactivados.
- **Descartado:**
  - **Checkout API (formulario de tarjeta propio):** más alcance de PCI y más superficie de ataque.
  - **Confiar en la URL de retorno:** se puede falsificar.
  - **Otros proveedores:** menos presentes en Uruguay para este caso.
- **Consecuencias:**
  - Hoy los pagos se simulan (no hay credenciales).
  - La integración real se prueba con las cuentas de prueba siguiendo [mercadopago-prueba.md](mercadopago-prueba.md).
  - La persona sale del sitio para pagar.

---

Decisiones más chicas, con su porqué en el código o en progreso.md:
- fechas en UTC en la conexión;
- moneda única (UYU);
- secretos solo en `.env`, validados al arrancar;
- logs JSON con redacción ([despliegue.md](despliegue.md));
- espera de 7 días para versiones nuevas de dependencias ([seguridad.md](seguridad.md)).
