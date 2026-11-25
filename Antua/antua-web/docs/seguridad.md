# Revisión de seguridad (Fase 16)

Revisión hecha el 23 y 24/11/2026 sobre la rama `feat/fase-16-seguridad-presentacion`. **Cada afirmación de este documento tiene una prueba**: un test automatizado (que corre en CI), una request contra un despliegue de prueba o la salida de una herramienta. Si algo no se pudo probar, está en [Lo que NO se cubrió](#lo-que-no-se-cubrió).

## Alcance y método

| Qué | Cómo |
|---|---|
| API (NestJS) y front (React) | Tests e2e contra una base MySQL propia (`antua_test`, contenedor aparte en el puerto 3317), tests unitarios y búsquedas en el código |
| Configuración de producción | El stack de `docker-compose.prod.yml` en un proyecto de Compose aparte (`antojarte-f16`, puertos 8081/8444 en 127.0.0.1, secretos generados con `generate-secrets.sh`, `.env` fuera del repo), con requests reales por el proxy |
| Dependencias y supply chain | `pnpm audit`, `pnpm licenses`, el workflow de CI, la configuración de Dependabot y la API de GitHub (solo lectura) |
| Historial de Git | Las 129 confirmaciones (`git log --all -p`) con patrones locales. No se descargó ninguna herramienta |

El entorno de desarrollo (`antua-mysql`, API y front) no se tocó.

**Severidad.**

| Nivel | Criterio |
|---|---|
| Alta | Explotable desde afuera con daño directo (datos de otros, tomar cuentas, ejecutar código) |
| Media | Explotable con condiciones, o daño acotado |
| Baja | Endurecimiento: no hay un ataque concreto hoy, pero reduce el riesgo o el error humano |
| Info | No es una vulnerabilidad; se documenta por claridad |

**Estado:** **corregido** (con test que lo prueba), **aceptado** (riesgo conocido, con motivo) o **pendiente de decisión** (requiere una decisión tuya; hay una recomendación).

## Resumen de hallazgos

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Dependencias con avisos: 97, 3 críticos (`proxy-addr`, `handlebars`) y DoS en `multer` y `body-parser` | Media | **Corregido**: quedan 18, ninguno en código de producción |
| 2 | La API aceptaba JWT firmados con HS384/HS512 (no fijaba el algoritmo) | Baja | **Corregido** |
| 3 | El carrito devolvía `guest_token` en el cuerpo, además de la cabecera | Baja | **Corregido** |
| 4 | Los campos de más en un pedido se ignoraban en silencio, en vez de rechazarse | Baja | **Corregido** (`forbidNonWhitelisted`) |
| 5 | El bundle borraba el aviso de licencia de GSAP, que su licencia prohíbe quitar | Baja (legal) | **Corregido** |
| 6 | `@scarf/scarf` mandaba telemetría de instalación a un servidor externo | Baja (privacidad) | **Corregido** |
| 7 | El `down` de la migración propuesta de índices fallaba (error 1553) | Media (operación) | **Corregido** (sin aplicar) |
| 8 | Errores de la API: 413 y 503 se logueaban con stack, sin id de petición ni formato | Baja | **Corregido** (16.3) |
| 9 | Dependabot: las alertas y las actualizaciones de seguridad están **desactivadas** en el repo (público) | Media | **Pendiente de decisión** |
| 10 | El proxy (Caddy) corre como root dentro del contenedor | Baja | **Pendiente de decisión** |
| 11 | El registro revela si un email ya tiene cuenta (409) | Baja | **Pendiente de decisión** (hoy, aceptado con límite de intentos) |
| 12 | Cerrar sesión no revoca el JWT en el servidor: vale hasta 7 días | Media | **Pendiente de decisión** |
| 13 | El JWT vive en `localStorage` (expuesto si hubiera un XSS) | Media | **Aceptado**, con mitigaciones probadas. Alternativa: cookie httpOnly, pendiente de tu OK |
| 14 | El link del pedido de invitado no vence (hasta que se reclama) | Baja | **Aceptado** |
| 15 | `node_modules` quedó en el historial (primeras confirmaciones): repo de 110 MB | Info | **Aceptado**: no se reescribe la historia |
| 16 | La recuperación tarda ~3 ms más si la cuenta existe | Info | **Aceptado**: no es explotable con el límite de intentos |

---

## 1. Dependencias y supply chain

### `pnpm audit`

| | Antes | Después |
|---|---|---|
| Críticos | 3 | 0 |
| Altos | 53 | 5 |
| Moderados | 37 | 13 |
| Bajos | 4 | 0 |
| **Total** | **97** | **18** |

**Lo que se actualizó** (commit `fix(deps)`), siempre dentro del mismo major y solo con versiones publicadas hace más de 7 días:

- **API:** Nest 11.1 → 11.2.10 (trae `multer` 2.5.0), `proxy-addr` 2.0.8, `body-parser` 2.4.0, `mysql2` 3.24, TypeORM 1.1.3.
- **Web:** axios 1.21, react-router 7.18.5, Vite 8.3.8.
- **Herramientas:** handlebars, js-yaml, fast-uri, brace-expansion, qs, browserslist, source-map-js y fflate.

Después: build, lint y tipos sin errores, y todos los tests en verde.

**Triage de lo que se actualizó.**

| Paquete | Aviso | ¿Explotable en este uso? |
|---|---|---|
| `proxy-addr` (crítico) | IP falsa con redes IPv6 mapeadas en `trust proxy` | **No con la config por defecto**: `TRUST_PROXY=1` es un número de saltos, no una lista de redes. Sí lo sería con `TRUST_PROXY=<lista de IPs>`, que la API admite |
| `body-parser`, `multer` (altos) | DoS con cuerpos comprimidos o nombres de campo armados | **Sí**: los dos procesan requests públicas (la subida de imágenes solo de admins) |
| `handlebars` (crítico) | Inyección de JS al compilar plantillas | No: solo lo usa `ts-jest` en los tests, con plantillas propias |
| `mysql2` | Bomba de descompresión en el protocolo comprimido | No: la compresión no está activada y la base es interna |
| `axios` | Contaminación de prototipos y SSRF en el adaptador de Node | Bajo: en el navegador usa XHR/fetch y las URLs son fijas |
| `react-router` | CSRF en modo RSC | No: el sitio no usa React Server Components |
| `vite` | Servidor de desarrollo (`launch-editor`, `fs.allow`) | Solo en desarrollo, nunca en producción |

**Los 18 que quedan** son todos de herramientas de desarrollo o de build: no se ejecutan en el servidor ni llegan al navegador.

| Paquete | De dónde viene | Por qué queda |
|---|---|---|
| `extract-zip` (alto) | Lighthouse → puppeteer | No tiene versión corregida. Solo descarga Chrome para medir |
| `basic-ftp` (alto) | Lighthouse → puppeteer → proxy-agent | Corregido solo en un major nuevo; puppeteer fija el actual |
| `zod` 3 (alto) | `eslint-plugin-react-hooks`, puppeteer | El arreglo está en zod 4 (otro major) |
| `@opentelemetry/*` (moderados) | Lighthouse → Sentry | Fijados por Lighthouse; solo exponen un nombre de usuario de base en trazas que no usamos |
| `glob`, `minimatch` (moderados) | Nest CLI, jest | El arreglo es un major nuevo; los patrones son nuestros, no de usuarios |

Se vuelven a revisar con `pnpm audit` y con los PR de Dependabot.

### Supply chain

- **GitHub Actions** (`.github/workflows/ci.yml`):
  - permisos mínimos (`permissions: contents: read`);
  - todas las acciones fijadas por SHA, con la versión en comentario;
  - `persist-credentials: false` en cada checkout;
  - un tope de tiempo en cada job;
  - no hay `pull_request_target` ni secretos reales.
- **Espera de 7 días** para versiones nuevas (corregido):
  - `minimumReleaseAge: 10080` en `pnpm-workspace.yaml` y `cooldown: 7 días` en `dependabot.yml`;
  - una versión maliciosa de un paquete secuestrado suele detectarse y retirarse antes de eso;
  - las actualizaciones de seguridad de Dependabot no esperan.
- **Scripts de instalación:** solo corren los permitidos en `allowBuilds` (bcrypt y unrs-resolver). Se bloqueó `@scarf/scarf`, que solo manda estadísticas de instalación.
- **Dependabot** (hallazgo 9). `dependabot.yml` cubre npm, Docker, Compose y Actions y propone PR semanales. Pero la API de GitHub dice que en el repo:
  - `dependabot_security_updates` está **disabled**;
  - las alertas de vulnerabilidades están **desactivadas** (HTTP 403 "Dependabot alerts are disabled for this repository");
  - secret scanning y push protection, en cambio, **sí** están activos.

  **Recomendación:** activar las dos en *Settings → Code security*. No lo hice porque es una configuración de tu cuenta.

### Secretos en el historial de Git

- **Método:** `git log --all -p` sobre las 129 confirmaciones (12,5 MB de diff, sin `node_modules` ni lockfiles). Se buscaron:
  - claves privadas (`BEGIN … PRIVATE KEY`);
  - tokens de AWS, GitHub, Slack, Google, Stripe, OpenAI, SendGrid y Mercado Pago (`APP_USR-`, `TEST-`);
  - JWT;
  - asignaciones literales de `PASSWORD`, `SECRET`, `TOKEN` y `KEY` en código y en archivos `.env`.

  También se listaron los archivos sensibles que se hayan agregado alguna vez (`.env`, `.pem`, `.key`, respaldos `.sql`).
- **Resultado: ningún secreto real.**
  - Nunca se confirmó un `.env`: solo los `.example`, con valores `EJEMPLO-…`, `tu_password` o vacíos.
  - El único token con formato real es uno sintético de un test (`APP_USR-1234567890123456-…-abcdef0123456789…`).
  - Las contraseñas que aparecen son de tests (`ClaveSegura123`) o de CI (`ci-solo-pruebas`).
- **Hallazgo 15:** `Antua/node_modules` se confirmó en `bb60d986` y se sacó en `ab1c7594` (42.868 archivos). No hay secretos, pero explica casi todo el tamaño del repo (pack de 110 MB). Limpiarlo exige reescribir la historia: no se hizo.

### Licencias

Resumen en [creditos.md](creditos.md):
- sin GPL, AGPL ni LGPL;
- las fuentes son OFL, Lucide es ISC y Three.js es MIT;
- GSAP tiene una licencia propia y gratuita, con condiciones.

**Hallazgo 5:** el minificador borraba el comentario `@license … GreenSock`, y la licencia de GSAP prohíbe quitar sus avisos.
- Ahora `vite.config.ts` lo repone en los archivos que contienen GSAP. Se verificó en `dist/assets/`.
- Además, el build publica `/licencias.md` con el texto de las 18 licencias del bundle.

## 2. Autenticación y sesiones

Todo en `antua-api/test/auth-sessions.e2e-spec.ts`, salvo lo marcado.

| Caso | Resultado | Test |
|---|---|---|
| JWT vencido con firma válida | 401 | auth-sessions |
| JWT firmado con otra clave | 401 | auth-sessions |
| JWT con el `sub` cambiado y la firma original | 401 | auth-sessions |
| `alg: none` | 401 | auth-sessions |
| HS512 con la clave correcta | **401 (antes 200)**: hallazgo 2, corregido. Sin el arreglo el test falla; se comprobó | auth-sessions |
| Basura, esquema distinto de Bearer, token en la URL | 401 | auth-sessions |
| Usuario borrado con token vigente | 401 | auth-sessions |
| Usuario "desactivado" | No aplica: el modelo no tiene usuarios desactivados. El equivalente es quitarle el rol admin, y deja de servir en el mismo request (se lee de la base) | admin-auth |
| Cambio de contraseña | Invalida todos los JWT anteriores | account, auth-sessions |
| Cerrar sesión | Borra el token del navegador. **El servidor no lo revoca** (hallazgo 12) | authStore.test (front), auth-sessions |
| Token de recuperación | De un solo uso, vence a los 60 min, uno nuevo anula el anterior, se guarda solo el hash | account |
| Token de pedido de invitado | 256 bits, solo el hash en la base, comparación en tiempo constante. Deja de servir al reclamarlo; reclamo solo en 24 h. **Para ver el pedido, no vence** (hallazgo 14) | orders |
| Fijación de rol | Registro y perfil con `role` → 400. Un JWT válido que dice `role: admin` no abre /admin: el rol sale de la base | admin-auth, auth-sessions |

### Enumeración de cuentas

| Flujo | ¿Revela si el email existe? | Evidencia |
|---|---|---|
| Login | No: mismo 401 y mismo cuerpo. Tiempo: 62,4 ms con cuenta y 62,4 ms sin cuenta (mediana de 7; sin cuenta se compara contra un hash falso) | auth-sessions |
| Recuperación | No: mismo 200 y mismo mensaje. Responde antes de buscar la cuenta. Tiempo: 8,4 ms y 4,9 ms (hallazgo 16) | auth-sessions, account |
| Registro | **Sí:** 409 "Email ya registrado" (hallazgo 11) | auth-sessions |

**Hallazgo 11, decisión pendiente.**
- **Hoy:** el registro dice que el email ya existe. Ayuda a quien se equivocó de cuenta, y la mitigación es el límite de 10 registros por minuto y por IP. Sin verificación de email, responder igual que si se hubiera creado la cuenta confundiría a la persona.
- **Recomendación:** si se agrega verificación de email (es un cambio grande), responder siempre "te enviamos un correo" y avisar por correo a quien ya tenía cuenta.

**Hallazgo 16.** Con cuenta, la recuperación responde ~3 ms más lenta, porque la búsqueda en segundo plano compite por el event loop. Para medirlo con confianza harían falta cientos de pedidos, y el límite es de 5 cada 15 minutos por IP. Aceptado.

### Límite de intentos detrás del proxy

- **Test** (`trust-proxy.e2e-spec.ts`), con `TRUST_PROXY=1`:
  - el límite cuenta por el último salto de `X-Forwarded-For`, el que agrega Caddy;
  - cambiar los valores anteriores en cada intento, o mandar `X-Real-IP` o `Forwarded`, no reinicia el contador: 10 × 401 y después 429;
  - otro cliente no queda bloqueado.
- **Por el proxy real:** 12 logins con un `X-Forwarded-For` y un `X-Real-IP` falsos distintos en cada uno dieron `401 ×10, 429, 429`.

### Token en `localStorage` (hallazgo 13)

- **Riesgo:** si alguien lograra ejecutar JavaScript en el sitio (un XSS), podría leer el JWT y usarlo hasta que venza (7 días) desde otra máquina.
- **Mitigaciones activas, probadas:**
  - **CSP sin `unsafe-*`:** `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. Lo verifica `check-headers.sh` contra el proxy, y en la Fase 14 un script en línea quedó bloqueado.
  - **Sin HTML crudo:** ninguna llamada a `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` ni `new Function` en `antua-web/src`. Se buscó con `grep -rnE` sobre todo `src/`, sin tests: 0 resultados.
  - **Texto como texto:** el HTML guardado se muestra como texto (sección 4).
  - **Sin terceros:** no hay scripts externos. Las fuentes y los íconos están en el bundle.
- **Alternativa: cookie `httpOnly; Secure; SameSite=Strict`.** El JavaScript no podría leer el token.
  - **Costo:** cambiar el login y el logout de la API (`Set-Cookie`), y leer la cookie en la estrategia JWT.
  - **CSRF:** agregar protección. `SameSite=Strict` alcanza en el mismo origen; si no, un token CSRF.
  - **CORS:** ajustarlo si el front vive en otro origen (`credentials`).
  - **Front:** dejar de guardar el token.
  - **Estimación:** 1 o 2 días con tests.

  **No lo cambié: espera tu OK.**

### Revocación al cerrar sesión (hallazgo 12)

- **Hoy:** un JWT copiado antes de cerrar sesión sigue valiendo hasta vencer, salvo que se cambie la contraseña. El test `sin revocación en el servidor` fija ese comportamiento.
- **Opciones**, de menor a mayor costo:
  1. bajar `JWT_EXPIRES_IN` de 7 días a 1 (cambio de config: las sesiones duran menos);
  2. agregar `token_version` al usuario y un `POST /auth/logout` que lo incremente (una migración y un cambio chico);
  3. la cookie httpOnly con sesiones del lado del servidor.

  **Recomendación:** la 2, que también sirve para un botón "cerrar todas las sesiones".

## 3. Autorización

### Matriz de IDOR

`antua-api/test/idor-matrix.e2e-spec.ts` cubre **cada** ruta con parámetros fuera de /admin: 18 rutas. Las 33 de /admin las cubre `admin-auth.e2e-spec.ts` con 401/403 sobre todas las rutas registradas.

Para cada una:
1. La usuaria A intenta usar un recurso de B.
2. Alguien sin sesión lo intenta también.
3. B lo usa de verdad. Si B no pudiera, el 404 de A no probaría nada.

**El test falla si aparece una ruta con id que no está en la matriz**, o si la matriz nombra una ruta que ya no existe.

| Rutas | A sobre lo de B | Sin sesión |
|---|---|---|
| `/addresses/:id` (GET, PATCH, DELETE, `/default`) | 404 | 401 |
| `/orders/:id`, `POST /orders/:id/claim` | 404 | 401 |
| `/orders/guest/:id`, `/orders/:id/payment` (GET, POST, `/retry`) | 404 | 404 (aceptan invitados: sin el token es anónimo) |
| `/cart/items/:id` (PATCH, DELETE; de cuenta y de invitado) | 404 | 404 |
| `/products/:slug/reviews/:id` (PATCH, DELETE), `POST /products/:slug/reviews` | 404 / 403 | 401 |
| `/products/:slug`, `/products/:slug/reviews`, `/tags/:id` | Públicas | — |

**Política:** el recurso ajeno da 404, no 403, así no se confirma que el id exista.

### Campos de las respuestas

- **Cómo:** el mismo test junta los campos de todas las respuestas de cliente y públicas: la matriz, `/auth/me`, `/users/me`, `/orders`, `/cart`, `/products`, el login y el pedido de invitado. Después los compara con dos listas:
  - **Prohibidos** (en cualquier nivel): `password`, `password_hash`, `password_changed_at`, `guest_access_token_hash`, `token_hash`, `guest_token`, `internal_note`, `changes`, `mp_payment_id`, `raw`, `admin`.
  - **Permitidos:** 64 campos. Uno nuevo hace fallar el test hasta que se revisa.
- **Hallazgo 3:** el carrito devolvía `guest_token`. No era una fuga a terceros (solo lo ve quien ya lo tiene), pero es una credencial en el cuerpo: ahora viaja solo en `X-Guest-Token`.
- **Campos sensibles que sí aparecen:** `email`, `phone`, `role` y `token` salen solo en los datos de la propia cuenta. De otras personas solo se ve `user.{id, full_name}` en las reseñas (test en `reviews.e2e-spec.ts`).

## 4. Entradas y subidas

`antua-api/test/inputs.e2e-spec.ts`:

| Caso | Resultado |
|---|---|
| Orden con `price;DROP TABLE users`, `__proto__`, `name DESC` | 400 (`@IsIn`, lista blanca) |
| Búsqueda `' OR 1=1 --` en el catálogo | 400 |
| Búsqueda `' OR '1'='1` en el panel | 200 sin resultados (consulta parametrizada) |
| Filtros con operadores (`categories[$gt]=`) o comillas | 400 |
| `page=-1`, `page=1e309`, `limit=0`, `limit=1000000`, precios negativos, `NaN`, `1e400` | 400 |
| Página enorme (`page=99999999999999999999`) | 200: la última página |
| Cantidad `abc`, `-1`, `0`, `1.5`, `1e20`; id `1 OR 1=1` | 400 |
| Id fuera de rango (2³¹) | 404 |
| Array en vez de objeto; objeto en vez de email (`{"$gt": ""}`) | 400 |
| Nombre de 50.000 caracteres, calle de 10.000 | 400 |
| Cuerpo de 2 MB | 413 "El pedido es demasiado grande." |
| JSON roto | 400 |
| La tabla `users` después de todo eso | Intacta |

En ningún caso hubo un 500.

- **Asignación masiva (hallazgo 4).** Antes, `whitelist` descartaba en silencio los campos de más; ahora `forbidNonWhitelisted` rechaza la request entera con 400. Los tests de cada módulo prueban el 400 y que nada cambió:
  - `role` en el registro y en el perfil;
  - `email` en el perfil;
  - `total` en la nota y en el estado del pedido;
  - `times_used` en un cupón;
  - `id` en una variante;
  - `stock` al editar una variante.

  Los payloads del front coinciden con los DTO, y el webhook de Mercado Pago no usa DTO.
- **Subidas de imágenes** (inputs y admin-catalog):
  - El nombre del cliente nunca se usa: `../../../evil.php.png` se guarda como `<32 hex>.png`.
  - Se rechazan: SVG con scripts (como `image/svg+xml` o disfrazado de `image/png`), HTML con `Content-Type: image/png`, un ejecutable `MZ` como `.jpg` y más de 2 MB.
  - Cómo se decide: el tipo sale de los primeros bytes (*magic bytes*), no de la extensión.
  - Cómo se sirven: con `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` y nunca fuera de la carpeta de subidas.
- **XSS almacenado.** La base guarda el texto tal cual, y cada lugar que lo muestra lo escapa:
  - **API:** el HTML vuelve como JSON con `nosniff`, así que el navegador no lo interpreta (inputs).
  - **Sitio:** las reseñas con `<script>`, `<img onerror>`, `<svg onload>` y `javascript:` se muestran como texto. No se crea ningún elemento ni se ejecuta nada (`antua-web/src/test/stored-xss.test.tsx`).
  - **Panel:** lo mismo para el nombre, la dirección, el producto y la nota interna del pedido (stored-xss.test).
  - **Correos:** nombre y dirección con HTML quedan escapados en el HTML del correo (`order-mails.e2e-spec.ts`, Fase 15).
- **CSV:** las celdas que empiezan con `=`, `+`, `-`, `@`, tabulación o retorno se neutralizan con `'`. Test: `admin-exports.e2e-spec.ts` (Fase 15).

## 5. Configuración (despliegue de prueba)

Proyecto `antojarte-f16` con `docker-compose.prod.yml`, `NODE_ENV=production`, HTTPS interno de Caddy y la CA exportada para curl.

| Qué | Resultado |
|---|---|
| Cabeceras (`check-headers.sh`) | "Todo cumple": CSP sin `unsafe-*`, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy, Permissions-Policy, X-Frame-Options, sin `Server`, sin HSTS (modo internal), caché correcta, compresión |
| CORS | Un `Origin: https://atacante.example` no recibe `Access-Control-Allow-Origin`, y el preflight da 404 |
| Usuario de la API | `uid=1000(node)`: el proceso `node dist/main` no corre como root |
| Usuario del proxy | `uid=0(root)` (hallazgo 10) |
| Puertos en el host | Solo el proxy, en 127.0.0.1:8081/8444. La base y la API no publican nada; la base está solo en la red `backend` |
| Usuario `antua_app` | `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` → `ER_TABLEACCESS_DENIED_ERROR`; `GRANT` → `ER_ACCESS_DENIED_ERROR`; `SELECT` permitido |
| Errores sin detalles | 404, JSON roto (400), cuerpo grande (413) y orden inválido (400): JSON con `requestId`, sin stack ni rutas |
| Error real de la base | Con la base detenida, `/api/products` da `500 {"message":"Ocurrió un error inesperado…","requestId":…}`, sin el error de MySQL. El detalle (`getaddrinfo EAI_AGAIN db`) quedó solo en el log, con el mismo `requestId` |
| Salud | Con la base detenida, `/health/ready` da 503 y `/health/live` 200. `check-health.sh` sale con 1 y la API se recupera sola en ~4 s |
| Logs | Todas las líneas en JSON. Después de registrarse, iniciar sesión y pedir recuperación, el email y la contraseña aparecen **0 veces** en los logs |
| Límite de intentos | Ver sección 2 |

**Hallazgo 10, decisión pendiente.** La imagen oficial de Caddy corre como root dentro del contenedor. Si Caddy tuviera una vulnerabilidad, el atacante sería root en ese contenedor, aunque no en el host. Mitigaciones actuales:
- límite de memoria;
- solo la red del proxy;
- la API y la base en otros contenedores.

**Recomendación:** `user: caddy` (o un uid fijo), `cap_add: [NET_BIND_SERVICE]` para los puertos 80/443, `cap_drop: [ALL]` y `chown` de los volúmenes `caddy_data` y `caddy_config`. Hay que probarlo con un servidor ya en uso, porque los certificados guardados son de root.

## 6. Observabilidad (16.3)

- **Logs:** JSON en producción, con `requestId` en cada línea. Redactan contraseñas, tokens, JWT, `Authorization`, campos `*hash*`, `*secret*` y `*token*`, y emails (`a***@dominio`), en mensajes, objetos y stacks.
- **Filtro de errores:** todo error lleva `requestId`. Un error inesperado da 500 genérico; el detalle va solo al log.
- **Tests:** `observability.spec.ts` (unitario, incluido el modo producción) y `observability.e2e-spec.ts`. Ver [despliegue.md](despliegue.md), "Logs de la API" y "Salud: vivo y listo".

## Lo que NO se cubrió

Esta revisión no reemplaza a una auditoría profesional. **No** se hizo:

- **Penetración real:** no hubo pentest por terceros, ni escaneo automático tipo ZAP o Burp, ni fuzzing extenso. Los casos hostiles son los de esta lista, escritos a mano.
- **Infraestructura del servidor:** no se revisaron el sistema operativo, SSH, el firewall, las actualizaciones automáticas, el acceso físico ni los respaldos fuera del servidor. Todo se probó en Docker Desktop sobre Windows.
- **Mercado Pago real:** no hay credenciales. El webhook se probó con firmas simuladas (`payments.e2e-spec.ts`) y nunca contra Mercado Pago.
- **Correo real:** sin SPF, DKIM ni DMARC, que dependen del dominio. Solo Mailpit en local.
- **Navegadores:** la CSP y el XSS se probaron con Chromium (Playwright) y jsdom. Firefox y WebKit, solo en los e2e generales de la Fase 13.
- **Ataques de disponibilidad:** solo los límites de tamaño y de intentos; ninguna prueba de carga. Una inundación de requests desde muchas IPs no está mitigada más allá de Caddy y el límite por IP.
- **Lógica de negocio fina:** por ejemplo, cupones combinados en carreras de concurrencia, o el stock con muchos pedidos simultáneos (hay tests de stock, pero no de carga).
- **Cadena de suministro a fondo:** no se auditó el código de cada dependencia. Se confía en `pnpm audit`, en la espera de 7 días y en el lockfile.
- **Panel en profundidad:** se probó que solo los admins entran y qué no pueden hacer; no se modeló un admin malicioso, que ve todo por diseño.
- **Privacidad legal:** el texto de [Privacidad](../src/pages/info/Privacy.tsx) no lo revisó un abogado, y dice que hoy no hay proveedor de correos conectado (depende de tu configuración de SMTP).

## Cómo repetir esta revisión

```bash
cd Antua
pnpm audit                                   # dependencias
pnpm licenses list -r --prod                 # licencias
pnpm --filter antua-api test                 # unitarios (incluye observabilidad)
pnpm --filter antua-api test:e2e             # e2e: auth-sessions, idor-matrix, inputs, observability, trust-proxy…
pnpm --filter antua-web test                 # front, incluido stored-xss
# Contra un despliegue de prueba (ver despliegue.md, "Verificar el despliegue"):
CURL_OPTS="--cacert caddy-root.crt" ./scripts/check-headers.sh https://localhost:8443
CURL_OPTS="--cacert caddy-root.crt" ./scripts/check-health.sh https://localhost:8443
```
