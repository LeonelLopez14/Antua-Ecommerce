# Prompt: Fases 9 a 11 de Antojarte (Backend: integridad y huecos, Payments, Cierre)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. Las Fases 5 a 8 ya están terminadas: no las repitas.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre fases. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta en este archivo ni en la documentación, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md y docs/estado-frontend.md antes de empezar.
- Todo en TypeScript estricto, sin `any`. Front y back.
- Esta vez SÍ podés modificar el backend (../antua-api): es el objetivo de las fases 9 y 10.
- Estoy aprendiendo NestJS y TypeORM. Por cada cambio de backend, explicámelo en lenguaje simple en docs/progreso.md (archivo y línea, qué fallaba o faltaba, qué cambió y por qué), y probá cada endpoint nuevo con una request curl que quede documentada.
- Antes de tocar el esquema de la base: hacé un respaldo (`docker exec antua-mysql mysqldump -uroot -p... antua_db > ~/respaldos/antua_db_FECHA.sql`, FUERA del repo) y averiguá cómo se gestiona el esquema (synchronize o migraciones). Preferí migraciones. No borres columnas ni tablas existentes sin preguntarme.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fases-9-11`), no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `node_modules`, respaldos, builds ni datos de seed. Nada de `--force` ni de reescribir historia. Si el push falla por credenciales, NO insistas en bucle: seguí commiteando localmente y avisame al final. No intentes crear ni pedir tokens o claves.
- Entorno: la base corre en MySQL 8 (contenedor antua-mysql) en 127.0.0.1:3307, porque el 3306 lo usa un MariaDB del sistema que NO hay que tocar. Si necesitás levantar la base: `docker start antua-mysql`.
- Decisiones ya tomadas: sin login con Google por ahora (queda como TODO). SHIPPING_FLAT_RATE se mantiene con el valor actual del .env.

## Paso 0 — Estado actual

1. Revisá `git log --oneline -n 10`, `git status` y la rama actual. Creá `feat/fases-9-11` a partir de `feat/fases-5-8`.
2. Verificá que la base (3307), la API (3000) y el front (5173) respondan; levantalos si hace falta.
3. Corré typecheck, lint, build y tests del front y del back. Anotá el resultado base en docs/progreso.md.
4. Mostrame un plan de 12 líneas de las Fases 9 a 11 y seguí sin esperar.

## Fase 9 — Backend: integridad y huecos pendientes

Orden por prioridad. En cada ítem: DTOs con validación, tests (unitarios y/o e2e), curl documentado y el ajuste correspondiente en el front.

**9.1 Precio cobrado (integridad).** `POST /orders` cobra hoy el precio actual de la variante y no el que mostró el carrito (orders.service.ts, alrededor de la línea 90). Implementá esto: al crear el pedido, comparar el precio del snapshot del carrito con el precio actual; si cambió, NO crear el pedido: devolver 409 con un mensaje claro y los precios nuevos, actualizar el snapshot del carrito y hacer que el front muestre el aviso ("El precio de X cambió de $A a $B") y pida confirmar. Cubrilo con un test.

**9.2 Pedidos de invitado → cuenta.** Hoy no se asocian. RESTRICCIÓN DE SEGURIDAD: NO vincules pedidos por email, porque no hay verificación de email y cualquiera podría registrarse con el email ajeno y ver sus pedidos. Proponé y justificá un mecanismo seguro (por ejemplo, un token de acceso al pedido generado al crear el pedido de invitado, o el token de invitado del carrito) para que, al crear la cuenta desde la pantalla de confirmación, se vinculen solo los pedidos de esa sesión. Implementalo y probá que otro usuario no pueda reclamar pedidos ajenos.

**9.3 Cupón retirado por no llegar al mínimo.** Hoy se quita sin avisar. Que el backend devuelva un campo de aviso (por ejemplo `warnings`) en la respuesta del carrito, y que el front lo muestre en el drawer y en el checkout con aria-live="polite".

**9.4 Plazo de envío.** Agregá la estimación de plazo (variable de entorno, por ejemplo SHIPPING_ETA_DAYS, documentada en .env.example) a la respuesta del carrito/pedido y mostrala en el drawer, el checkout y el detalle del pedido.

**9.5 Paginación, filtros y orden en GET /products.** Query DTO validado con whitelist de campos de orden y límite máximo. Soportá categoría/tag (múltiples), rango de precio, orden y paginación (página y tamaño). Migrá la lógica de `lib/shopQuery.ts` del front a usar el backend, manteniendo el comportamiento actual de la URL y de los estados. Mantené la compatibilidad si algún otro código llama al endpoint sin parámetros.

**9.6 Reseñas: editar y borrar la propia.** Solo el autor. Mantené la regla de reseñar solo productos comprados y entregados y una reseña por usuario y producto. Front: acciones en la reseña propia (borrar con confirmación).

**9.7 Perfil.** GET/PATCH /users/me (nombre, teléfono) y cambio de contraseña (pidiendo la actual). Página /cuenta/perfil en el front, con validación en línea. Nunca devuelvas el hash de la contraseña.

**9.8 Recuperación de contraseña.** Flujo completo: solicitud por email, token de un solo uso con vencimiento, guardado hasheado, respuesta idéntica exista o no el email (para no revelar cuentas), y límite de intentos. No hay SMTP: creá un MailService con un transporte de desarrollo que escriba el mensaje en el log de la API (y dejá la interfaz lista para conectar un proveedor real). Front: /olvide-mi-contrasena y /restablecer-contrasena?token=..., conectando el link "¿Olvidaste tu contraseña?" del AuthModal.

**9.9 Newsletter.** POST /newsletter/subscribe con email único y validación; no reveles si ya estaba suscripto. Habilitá el formulario del footer.

**9.10 Endurecimiento básico.** Rate limiting (por ejemplo @nestjs/throttler) en login, registro, recuperación y cupones; helmet; CORS restringido por variable de entorno (sin `*`); política mínima de contraseña; verificá que el JWT tenga vencimiento; que ningún endpoint filtre datos de otros usuarios (revisá ownership en pedidos, direcciones y reseñas). Listá cualquier hallazgo y corregilo.

## Fase 10 — Payments

Leé antes el módulo de Orders, el manejo de stock y el PaymentStep.tsx (donde está el `TODO(payments)`). Escribí primero un diseño breve en docs/payments-design.md y seguí, salvo que aparezca una decisión que me corresponda.

- Proveedor: Mercado Pago, que opera en Uruguay, con Checkout Pro (redirección a la página de pago alojada por el proveedor) y SOLO credenciales y cuentas de prueba (sandbox). Verificá en la documentación oficial vigente los nombres de endpoints, campos y la verificación de firma del webhook; no los supongas. Con Checkout Pro ningún dato de tarjeta pasa por nuestro servidor ni por nuestro front: no hagas ni dejes ningún campo de tarjeta.
- Esto es un proyecto de práctica: nada de dinero real ni credenciales de producción.
- Backend: módulo Payments con (a) endpoint que crea la preferencia de pago para un pedido propio y pendiente, usando SIEMPRE el total del pedido calculado en el servidor, nunca un monto que mande el cliente; (b) webhook que verifique la firma, sea idempotente (el mismo evento dos veces no duplica nada), consulte el estado real del pago al proveedor y valide que el monto y la moneda coincidan con el pedido; (c) tabla de pagos (id del proveedor, estado, monto, referencia al pedido; sin guardar payloads completos con datos personales); (d) transiciones de estado del pedido claras (pendiente → pagado / fallido / cancelado) y política de stock coherente con lo que ya hace Orders cuando un pago falla o vence; (e) endpoint para reintentar el pago de un pedido pendiente.
- Variables de entorno (access token, secreto del webhook, URLs de retorno) solo en .env.example con valores de ejemplo falsos. Los reales los pongo yo. Si faltan, la API debe fallar al arrancar con un mensaje claro o dejar Payments deshabilitado con aviso, según lo más seguro.
- Frontend: PaymentStep real (crea el pedido, obtiene la preferencia y redirige), páginas de retorno /pago/exitoso, /pago/pendiente y /pago/fallido con mensajes claros y accesibles, estado de pago en el detalle del pedido de Mis pedidos y botón "Reintentar el pago" para pedidos pendientes. No confíes en la URL de retorno para marcar un pedido como pagado: el estado lo define solo el webhook/consulta del servidor.
- Pruebas: como el webhook necesita una URL pública, NO abras túneles ni expongas la API a internet. Probá con un script que envíe eventos firmados de prueba, y escribí tests de la verificación de firma, idempotencia y discrepancia de monto. Dejá documentado en docs/payments-design.md cómo probar de punta a punta con un túnel cuando yo decida hacerlo.

## Fase 11 — Cierre

- README raíz y de cada paquete: qué es el proyecto, requisitos, cómo correr todo desde cero (base de datos en Docker, variables de entorno, migraciones, seed), cómo correr tests y e2e, estructura de carpetas, y las decisiones técnicas principales.
- docker-compose.yml para db + api (+ front opcional) con puertos configurables por variable (por el conflicto con MariaDB en 3306, el puerto de MySQL expuesto debe ser configurable y por defecto 127.0.0.1:3307), sin credenciales en el archivo (usar .env).
- Endpoint /health en la API. Seed reproducible y SEGURO de datos de prueba (productos, tags, cupones, usuarios de prueba) con su script de limpieza, guardado en el repo (los anteriores se perdieron). Nada con contraseñas reales.
- Revisá el `.gitignore` de ambos paquetes y de la raíz; confirmá con `git ls-files` que no hay `.env`, `node_modules` ni respaldos versionados.
- Páginas institucionales y legales: dejá el texto provisorio marcado como está y listame qué falta redactar.

## Check final (después de cada fase y al terminar todo)

1. Front: typecheck, lint, build y tests. Back: build, tests unitarios y e2e. Sin errores ni warnings nuevos.
2. Con playwright-cli y el spec e2e: recorré el flujo completo en 375 px y 1280 px, claro y oscuro, como invitado y con cuenta, incluyendo precio cambiado, cupón retirado, recuperación de contraseña, perfil, reseñas y el flujo de pago con pagos simulados. Guardá capturas en docs/checks/.
3. /web-interface-guidelines sobre los archivos nuevos o modificados de src/ y corregí lo que marque.
4. Verificá DESIGN.md: tokens, radios, sin hex sueltos fuera del 3D, ningún `transition: all`, ningún `outline-none` sin reemplazo, voseo.
5. Revisión de seguridad: ownership en cada endpoint nuevo, validación de entrada, ningún secreto en el repo, ningún dato personal en logs.
6. Actualizá docs/estado-frontend.md y docs/progreso.md, y CLAUDE.md con las convenciones nuevas.
7. Reporte final de máximo 12 líneas: qué quedó terminado, qué quedó pendiente, qué necesita una decisión mía y qué depende de credenciales o cuentas que debo crear yo (Mercado Pago, SMTP, etc.). Si algún push falló, decímelo explícitamente con los hashes de los commits locales.
