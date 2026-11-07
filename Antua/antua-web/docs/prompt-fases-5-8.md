# Prompt: Fases 5 a 8 de Antojarte (Checkout, Cuenta, Reseñas y páginas, Pulido)

Este archivo ES el pedido nuevo. Ejecutá todo lo que dice acá, empezando por el Paso 0. No es una repetición de los pasos 1 a 4 de antes: esos ya están completos.

## Reglas generales

- Trabajá en orden, sin esperar mi OK entre fases. Pará y preguntame SOLO si (a) algo requiere cambiar el backend, (b) hay una decisión irreversible o de producto que no esté en DESIGN.md ni en la documentación, o (c) algo falla y no podés resolverlo.
- Leé DESIGN.md y CLAUDE.md antes de empezar.
- Todo en TypeScript estricto, sin `any`.
- Commits: TENÉS permiso para hacer commits y push en mi repositorio de GitHub (LeonelLopez14/Antua-Ecommerce). Reglas:
  - Trabajá en una rama propia (`feat/fases-5-8`), no en `main`. Si no existe, creala. No hagas merge a `main` ni push a `main` sin mi OK explícito.
  - Un commit por fase (más uno por cada arreglo de backend), con mensaje claro en español o inglés, en imperativo, que explique el qué y el porqué.
  - Antes de cada commit revisá `git status` y `git diff --staged`. NUNCA incluyas `.env`, `node_modules`, builds, capturas pesadas ni datos de seed. Verificá que el `.gitignore` los excluya (en el repo ya se subió `Antua/node_modules` una vez; si sigue versionado, avisame y no lo repitas).
  - No uses `--force`, `reset --hard` ni reescribas historia. Si un push falla, mostrame el error en vez de forzarlo.
  - Al terminar cada fase, hacé push de la rama y anotá el hash del commit en docs/progreso.md.
- No inventes endpoints, campos ni respuestas del backend: leé siempre ../antua-api/src (controllers, DTOs, entidades) antes de usar una ruta.
- Si necesitás tocar el backend, frená y proponémelo con el cambio exacto; no lo apliques sin mi OK (salvo lo que ya hiciste en el carrito).
- Llevá docs/progreso.md: al terminar cada fase anotá qué se hizo, qué falló, decisiones tomadas y pendientes. Si la sesión se corta, ese archivo permite retomar.

## Paso 0 — Estado actual

1. Los pendientes del backend (SHIPPING_FLAT_RATE validada, bugs del merge de carritos, Jest, filtro de inactivos en GET /products/:slug) ya están hechos. No los repitas.
2. Los servicios están apagados. Levantalos: `docker start antua-mysql`, la API (`pnpm dev` en antua-api) y el front (`pnpm dev` en antua-web). Verificá que GET /products y GET /cart respondan.
3. Verificá el valor de SHIPPING_FLAT_RATE en antua-api/.env. Si es el 1500 provisorio, seguí y anotalo como decisión abierta en docs/progreso.md.
4. Corré typecheck, lint y build del front; build y tests del back.
5. Si alguna fase anterior (Home, Tienda, Ficha, Carrito, AuthModal) quedó incompleta o con errores, completala primero.
6. Mostrame un plan de 10 líneas de las Fases 5 a 8 y seguí sin esperar.

## Fase 5 — Checkout (/checkout)

Leé antes los módulos Orders, Cart y Addresses del backend: cómo se crea un pedido, qué datos pide (dirección, contacto, cupón), si admite invitados, qué devuelve y qué estados tiene. Si el backend exige login para crear pedidos, avisame con una propuesta y no lo esquives.

- Cuatro pasos con barra de progreso: Dirección → Envío → Pago → Confirmación. La URL refleja el paso (?paso=2) y el botón Atrás del navegador funciona.
- Guest checkout: sin login obligatorio y sin modal forzado. Si el usuario está logueado, ofrecé sus direcciones guardadas y "usar otra dirección". Si es invitado, pedí email, nombre y teléfono. La opción de crear cuenta se ofrece recién en la confirmación.
- Panel de resumen en accent-secondary, fijo e idéntico en los 4 pasos: ítems, cupón aplicado, envío, descuento y total, tal como los devuelve el backend. No calcules montos en el cliente. En mobile, colapsable arriba del formulario.
- Envío: método único y fijo, sin selector; mostrá el costo y el plazo que informe el backend.
- Pago: todavía no existe el módulo de Payments. NO hagas campos de tarjeta ni nada que simule cobrar. Este paso muestra un mensaje claro ("El pago online llega pronto. Tu pedido se registra y te contactamos para coordinar el pago") y la elección de método SOLO si el backend ya lo soporta. Dejá un único lugar con un TODO claro para conectar Payments más adelante.
- Confirmación: crea el pedido con la dirección elegida, muestra número de pedido, resumen, dirección y próximos pasos, y vacía el carrito. Si es invitado, ofrecé crear cuenta con el mismo AuthModal. Manejá el doble clic (botón deshabilitado durante la request) y la recarga de la página (no duplicar pedidos).
- Validación: errores en línea, foco al primer error, autocomplete correcto (given-name, email, tel, street-address, postal-code), inputmode donde corresponda, sin bloquear el pegado, aviso antes de salir con datos sin guardar.
- Errores del backend (stock insuficiente, cupón vencido, precios cambiados) con un mensaje accionable y un camino para volver al carrito.
- Estados: carrito vacío (redirigir a /tienda con mensaje), skeletons, errores con reintento.
- Navbar mínima (solo el logo) en checkout, como indica DESIGN.md.

## Fase 6 — Cuenta: Mis pedidos y Direcciones

- Rutas protegidas /cuenta/pedidos, /cuenta/pedidos/:id y /cuenta/direcciones. Sin sesión, abrí el AuthModal y, tras iniciar sesión, volvé a la ruta pedida. Agregá el acceso desde el menú del ícono de cuenta de la Navbar.
- Mis pedidos: lista con número, fecha (Intl.DateTimeFormat), total (Intl.NumberFormat) y estado en un badge. Estados vacío, de carga y de error. Si el backend ofrece paginación, usala.
- Detalle del pedido: ítems con el precio al momento de la compra (snapshot), dirección, cupón, totales y estado. Para productos de un pedido entregado, un link a la ficha para dejar una reseña.
- Direcciones: listado, alta, edición, eliminación (con confirmación) y marcar como predeterminada, según lo que soporte el backend. Formulario accesible con validación en línea.
- Todo con los tokens de DESIGN.md, claro y oscuro, voseo.

## Fase 7 — Reseñas y páginas que faltan

- Formulario de reseñas en la Ficha: visible solo con sesión iniciada. Calificación de 1 a 5 con un grupo de radios accesible (no solo clics sobre íconos) y comentario. El backend solo permite reseñar productos comprados y entregados: manejá ese rechazo con un mensaje claro ("Podés reseñar esta galleta después de recibir tu pedido"). Una reseña por usuario y producto. Si el backend permite editar o borrar la propia, implementalo; si no, avisame. Actualizá el promedio y el listado al enviar.
- Páginas del sitemap: revisá si el sitemap del Plan de proyecto (Antojarte_Plan_Proyecto.pdf) está disponible en el repo. Si no, listame las páginas que creas que faltan (por ejemplo Nosotros, Contacto, Preguntas frecuentes, Términos y Privacidad) y creá solo las que yo confirme. El texto de relleno debe estar en español con voseo y marcado como provisorio. El footer y la Navbar deben enlazarlas.
- Página 404 con la identidad de la marca y link a la Tienda.
- Newsletter del footer: solo si existe endpoint; si no, dejala deshabilitada con aria-disabled y un TODO.

## Fase 8 — Pulido, rendimiento, tests y documentación

**Rendimiento y estructura**
- Carga diferida por ruta con React.lazy + Suspense, con un skeleton de página. Three y @react-three/* deben quedar en un chunk aparte que solo se baje en la Home.
- Corré el build y mostrame el tamaño de los chunks; reducí lo que sobre. No agregues dependencias pesadas.
- ErrorBoundary global con pantalla de error amigable y botón de reintentar.
- document.title y meta description por página con un hook propio, sin librerías nuevas. Favicon, `<meta name="theme-color">` y color-scheme acordes al tema.

**Tema**
- Toggle claro/oscuro en la Navbar (sistema → claro → oscuro) con `@custom-variant dark` y la clase .dark. Persistí la elección en localStorage dentro de try/catch y evitá el parpadeo al cargar con un script mínimo en index.html.

**Accesibilidad**
- Skip link a "Contenido principal", jerarquía de encabezados correcta en cada página, aria-live para avisos, foco visible en todo, y revisión de contraste en ambos temas contra DESIGN.md.
- Revisá prefers-reduced-motion en TODAS las animaciones de GSAP y en la galleta 3D.

**Tests**
- Vitest + Testing Library para los stores (authStore y cartStore con respuestas simuladas) y componentes clave (ProductCard, stepper de cantidad, AuthModal). Pocos pero útiles.
- Playwright (@playwright/test) con un spec del flujo principal: Home → Tienda → Ficha → agregar → drawer → cupón → checkout → confirmación como invitado. Debe correr con un solo comando documentado.

**Limpieza**
- Eliminá archivos sin uso (src/App.css, assets de Vite, mocks), imports sin usar, console.log y código duplicado. Buscá `any`, `@ts-ignore` y TODOs sin ubicar.
- Verificá que .env.example (front y back) liste todas las variables.

## Check final (después de cada fase y al terminar todo)

1. Frontend: typecheck, lint, build y tests sin errores ni warnings nuevos. Backend: build y tests.
2. Con playwright-cli recorré el flujo completo en 375 px y 1280 px, claro y oscuro, como invitado y como usuario logueado: Home → Tienda → Ficha → carrito → cupón → checkout → confirmación → registro → Mis pedidos → direcciones → reseña. Guardá capturas en docs/checks/.
3. /web-interface-guidelines sobre TODOS los archivos de src/ y corregí lo que marque.
4. Verificá DESIGN.md: tokens, radios, sin hex sueltos fuera del 3D, ningún `transition: all`, ningún `outline-none` sin reemplazo, textos en voseo.
5. Actualizá docs/estado-frontend.md (qué está hecho, cómo correr todo, qué falta, decisiones abiertas) y agregá a CLAUDE.md las convenciones que hayas establecido (estructura de carpetas, manejo de errores, formato de precios, cómo se agregan rutas).
6. Reporte final de máximo 12 líneas: qué quedó terminado, qué quedó pendiente y qué necesita una decisión mía. Marcá aparte, de forma explícita, todo lo que dependa del módulo de Payments o de cambios en el backend.
