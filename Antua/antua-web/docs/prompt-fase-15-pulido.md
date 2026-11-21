# Prompt: Fase 15 de Antojarte (Emails, exportaciones, Home 3D, pulido y preparación de Mercado Pago)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. Las Fases 5 a 14 ya están terminadas: no las repitas. NO conectes ni llames a Mercado Pago real: no hay credenciales; el módulo Payments sigue con el proveedor simulado.

## Objetivo

Cerrar lo que falta para operar la tienda con comodidad: correos transaccionales reales (confirmación y cambios de estado), exportación de datos desde el panel, mejor rendimiento de la Home con la galleta 3D, los pendientes de diseño y calidad que quedaron abiertos, y todo lo necesario para que yo pueda probar Mercado Pago en modo de prueba cuando tenga mis cuentas.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre pasos. Pará y preguntame SOLO si (a) hay una decisión de producto o de seguridad que no esté resuelta acá, (b) algo es irreversible o toca datos existentes de forma destructiva, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md, CLAUDE.md, docs/progreso.md, docs/estado-frontend.md, docs/qa/informe-qa.md, docs/despliegue.md y docs/payments-design.md antes de empezar.
- Todo en TypeScript estricto, sin `any`. Front y back.
- Estoy aprendiendo NestJS y TypeORM: por cada cambio de backend, explicámelo en lenguaje simple en docs/progreso.md (archivo y línea, qué faltaba, qué cambió y por qué) y dejá curl documentados.
- Antes de tocar datos o esquema: respaldo de la base FUERA del repo. NUNCA apliques una migración generada sin que yo la haya leído. No apliques la migración propuesta de índices (database/proposed/).
- Mi entorno de desarrollo está corriendo ahora (contenedor `antua-mysql` en 127.0.0.1:3307, API en :3000, front en :5173). NO lo detengas ni lo reinicies sin avisarme. Si necesitás probar cosas destructivas, usá una base y un proyecto de Compose aparte con puertos distintos, y borrá solo lo que creaste.
- NO detengas, reinicies ni modifiques ningún servicio, contenedor o proceso que no pertenezca a este repo.
- Commits: TENÉS permiso para hacer commits y push en mi repo de GitHub (LeonelLopez14/Antua-Ecommerce) en una rama propia (`feat/fase-15-pulido`), no en `main`. Un commit por cambio lógico, con mensaje claro en imperativo. Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `.env.prod`, claves, certificados, respaldos, `node_modules`, builds, uploads ni capturas pesadas. Nada de `--force` ni de reescribir historia. Si el push falla, no insistas en bucle: seguí commiteando localmente y avisame al final.
- Decisiones ya tomadas: moneda UYU; sin Google login; marca visible "Antojarte" (no "Antua"); correo de ejemplo contacto@antojarte.example; migraciones explícitas; el borde de controles pasa a `#7E8A74` (ver 15.1; contraste calculado 3,50:1 sobre #FFFBE9 y 3,37:1 sobre #F7F5FF).

## Paso 0 — Estado actual

1. `git log --oneline -n 10`, `git status` y rama actual. Creá `feat/fase-15-pulido` a partir de `feat/fase-14-despliegue` (o de `main` si ya se mezcló).
2. Verificá que base, API y front respondan.
3. Corré typecheck, lint, build y tests de front y back, incluidos los e2e de la API (que quedaron sin correr tras la Fase 14). Anotá el resultado base en docs/progreso.md.
4. Mostrame un plan de 12 líneas de la Fase 15 y seguí sin esperar.

## 15.1 — Pendientes de diseño y calidad

- **Perfil:** avisar antes de salir con cambios sin guardar (hallazgo abierto de `/web-interface-guidelines`).
- **Borde de controles:** el borde `#A8B89A` sobre el fondo crema da 2,03:1 y no cumple 3:1 para límites de componentes. Introducí un token propio para el borde de controles (por ejemplo `--color-border-control: #7E8A74`) y usalo en el botón secundario y en los inputs, selects y textareas del modo claro. Los rellenos y badges con `#A8B89A` NO cambian. Definí y verificá un borde equivalente para el modo oscuro (mínimo 3:1 contra `#1E1D1C` y `#2A2826`; sugerencia de partida: `#CFC8BC` con menos opacidad solo si cumple el ratio medido, o un valor intermedio medido). Calculá y documentá los ratios reales con un script. Actualizá DESIGN.md (tokens, tabla de contraste y la sección de decisiones abiertas) y volvé a correr axe.
- **Marca:** buscá restos de "Antua" visibles al usuario (títulos, meta tags, textos, emails de ejemplo, `manifest`, favicon alt, el panel) y unificá en "Antojarte". "Antua" puede quedar solo en nombres de repositorio y de paquetes internos.
- **Pendientes de documentos:** revisá docs/qa/informe-qa.md y docs/estado-frontend.md, y resolvé los ítems abiertos que NO requieran una decisión mía. Listame los que sí.
- Ejecutá `/web-interface-guidelines` con el comando real sobre todo lo que toques.

## 15.2 — Home 3D: rendimiento

Hoy la Home da 67 en Lighthouse móvil (LCP ≈ 2,3 s). Mejoralo sin cambiar el aspecto:
- Mostrar de inmediato una imagen fija (poster) de la galleta, con `width`/`height` y `fetchpriority="high"`, y cargar el chunk de Three.js y montar la escena cuando el navegador esté libre (`requestIdleCallback` con alternativa) o cuando el hero sea visible. La transición del poster a la escena no debe producir saltos de layout (CLS).
- Pausar el render cuando el hero no está en pantalla o la pestaña está oculta, bajar `dpr` en dispositivos de gama baja (usá señales disponibles, como `navigator.hardwareConcurrency` y `deviceMemory` si existen, sin depender de ellas) y respetar `prefers-reduced-motion` mostrando solo el poster.
- Verificá que el fallback sin WebGL siga funcionando.
- Medí con Lighthouse (móvil, 3 corridas, mediana) antes y después, y anotá el resultado en docs/qa/. No hagas trampas para subir el puntaje: no ocultes el contenido ni retrases el texto del hero.

## 15.3 — Correos transaccionales

Leé el MailService actual (transporte de desarrollo que escribe en el log).
- Transportes configurables por variable de entorno: `log` (desarrollo, actual) y `smtp` (producción; variables `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`). En producción la API debe fallar al arrancar con un mensaje claro si el transporte es `smtp` y falta alguna variable. Agregá un servicio opcional de Mailpit al compose de DESARROLLO (perfil `mail`) para ver los correos en el navegador, sin exponerlo fuera de 127.0.0.1.
- Plantillas en español con voseo, en HTML y texto plano, con el diseño sobrio de la marca (colores de DESIGN.md, sin imágenes remotas ni rastreadores): (1) confirmación de pedido (número, ítems con precio del snapshot, descuento, envío, total, dirección, plazo estimado), (2) cambios de estado del pedido (en preparación, enviado, entregado, cancelado), (3) recuperación de contraseña (la que ya existe, migrada a la misma plantilla). Datos de usuario SIEMPRE escapados en el HTML (nombre, dirección, notas); ningún correo incluye contraseñas y los enlaces de un solo uso usan una `PUBLIC_URL` configurable.
- Un fallo de envío NUNCA debe romper la creación del pedido ni el cambio de estado: se registra el error (sin cuerpo del correo ni datos personales en el log), con un reintento simple, y el flujo sigue.
- Para pedidos de invitado, el correo de confirmación es la única vía de seguimiento: incluí el enlace o token seguro de acceso al pedido que definió la Fase 9, sin exponer datos de otros.
- Tests: plantillas (escape de HTML, campos obligatorios), el servicio con un transporte falso, y que un fallo de correo no afecta al pedido.
- Actualizá .env.example, .env.prod.example y docs/despliegue.md (variables de correo, y una nota sobre entregabilidad: SPF, DKIM y DMARC dependen del proveedor y del dominio real).
- NO envíes correos masivos ni implementes envíos de newsletter.

## 15.4 — Exportaciones del panel (CSV)

- Solo admins (guard de roles y test en la matriz de autorización): exportar pedidos (respetando los filtros del listado y un rango de fechas obligatorio con tope máximo de filas) y productos/variantes con stock.
- Seguridad: protegé contra inyección de fórmulas en CSV (valores que empiezan con `=`, `+`, `-`, `@`, tab o retorno de carro se prefijan de forma segura), no incluyas hashes ni tokens, y limitá los datos personales a los estrictamente necesarios. Cada exportación queda registrada en la auditoría (quién, qué y cuántas filas).
- Formato: UTF-8 con BOM y un separador pensado para Excel con configuración regional de Uruguay (que suele usar punto y coma como separador de listas); ofrecé un parámetro para elegir coma. Montos como números sin formato localizado, con la moneda en una columna aparte. Fechas en ISO 8601 y en hora de Montevideo, documentado.
- Respuesta en streaming para no cargar todo en memoria.
- Front: botones "Exportar CSV" en Pedidos y Productos, con estado de carga, errores y mensaje accesible.

## 15.5 — SEO adicional

- `GET /sitemap.xml` generado desde las páginas públicas y los productos activos (con `lastmod`), servido a través del proxy; `robots.txt` apunta al sitemap y sigue bloqueando /admin y /cuenta. Los productos inactivos o eliminados no aparecen. Actualizá la configuración de Caddy y la guía de despliegue.

## 15.6 — Preparación para probar Mercado Pago (sin conectarse)

- Un comando `payments:check` en la API que valide la configuración de Mercado Pago (variables presentes, formato razonable, modo de prueba vs. producción, URL pública del webhook configurada) SIN llamar a servicios externos, y que imprima qué falta.
- docs/mercadopago-prueba.md, paso a paso para que yo lo haga cuando tenga mis cuentas: crear la cuenta de desarrollador y las cuentas de prueba (vendedor y comprador), obtener las credenciales de PRUEBA y el secreto del webhook, cargar las variables, abrir un túnel temporal (explicá una o dos opciones y los riesgos; el túnel lo decido y lo abro yo), configurar la URL del webhook, hacer una compra de prueba de punta a punta con las tarjetas de prueba (indicá dónde está la lista OFICIAL vigente en lugar de copiar números de memoria; verificá los nombres de campos y pasos en la documentación oficial actual y marcá lo que no puedas verificar), qué comprobar (pedido en estado pagado solo por el webhook, el monto coincide, un evento duplicado no repite nada), y cómo volver al modo simulado.
- Revisá docs/payments-design.md y corregí lo que haya cambiado.
- NO llames a la API real de Mercado Pago ni crees cuentas. Sin credenciales, los tests siguen usando el proveedor simulado.

## Cierre

- Tests nuevos y todos los anteriores pasando (front, API unitarios y e2e, Playwright).
- Actualizá README, docs/estado-frontend.md, docs/progreso.md, CLAUDE.md, .env.example, .env.prod.example y docs/despliegue.md.
- Revisá `.gitignore` y confirmá con `git ls-files` que no hay `.env`, `.env.prod`, `node_modules`, respaldos, uploads ni reportes pesados versionados.

## Check final (después de cada subfase y al terminar)

1. Front y back: typecheck, lint, build y tests (incluidos los e2e de la API y los de Playwright), sin errores ni warnings nuevos.
2. Con playwright-cli y axe: recorré la compra completa (invitado y con cuenta), el panel (incluida la exportación) y la Home en 375 px y 1280 px, claro y oscuro. Cero violaciones serias o críticas, y verificá el contraste del nuevo borde en ambos temas.
3. Con Mailpit, comprobá de punta a punta que llega el correo de confirmación y el de cambio de estado, y que el HTML se ve bien en claro y oscuro y no ejecuta contenido inyectado (probá con un nombre que contenga HTML).
4. Lighthouse antes/después de la Home y de la Tienda (móvil y escritorio).
5. Seguridad: guard de roles en cada endpoint nuevo, inyección de fórmulas en CSV, escape en plantillas, ningún dato personal ni secreto en logs, y que la exportación quede auditada.
6. `/web-interface-guidelines` con el comando real sobre los archivos nuevos o modificados de src/.
7. Dejá mi entorno de desarrollo corriendo como lo encontraste y apagá y borrá solo lo que creaste vos.

## Reporte final

Máximo 12 líneas: qué quedó terminado, los puntajes antes/después de la Home, qué quedó pendiente, qué necesita una decisión mía, qué comandos debo correr yo y qué debo probar yo (correo real con mi proveedor, Mercado Pago de prueba). Si algún push falló, decímelo con los hashes de los commits locales.
