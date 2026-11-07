# Estado del frontend de Antua

Última actualización: 17/10/2026. Stack: React 19 + TypeScript estricto + Vite 8 + Tailwind v4 + GSAP + Three.js/R3F + Zustand + Axios + Lucide. Gestor de paquetes: **pnpm**.

## Qué está hecho

| Área | Ruta / componente | Notas |
|---|---|---|
| Home | `/` (`pages/Home.tsx`) | Hero con galleta 3D procedural (`three/cookie/`), pin y scrub con ScrollTrigger y mini carrusel de packs; categorías rápidas, destacados (API real), banner de ingredientes. `Cookie3D` acepta `modelUrl` para un `.glb` de Blender. |
| Tienda | `/tienda` | Filtros (categorías y precio con debounce), orden y paginación en la URL (`?categoria=…&min=…&max=…&orden=…&pagina=…`). Drawer de filtros en mobile. Estados: skeleton, vacío y error con reintento. |
| Ficha | `/producto/:slug` | Galería con miniaturas, variante en la URL (`?variante=x6`), cantidad limitada por stock, "Agregar al carrito" (abre el drawer) y "Comprar ahora" (agrega y va a `/checkout`). Ingredientes, alérgenos, nutrición ("pronto") y reseñas siempre visibles. 404 para slugs inexistentes o inactivos. |
| Carrito | `components/cart/CartDrawer.tsx` | Drawer derecho; ítems con stepper, quitar con "Deshacer", cupón con errores traducidos, totales del backend (subtotal, descuento, envío, total). Funciona igual para invitado (`X-Guest-Token`) y para usuario logueado. |
| Cuenta | `components/auth/AuthModal.tsx` | Modal con tabs "Iniciar sesión" / "Registrarme", validación en línea, errores del backend traducidos y merge del carrito de invitado al iniciar sesión. Menú de cuenta con "Cerrar sesión". |
| Checkout | `/checkout` | Página provisoria "Próximamente". |
| Base | `components/ui/Dialog.tsx` | Diálogo accesible compartido por los drawers y el modal: foco atrapado, Escape y overlay cierran, el foco vuelve al disparador, GSAP con variante para reduced motion. |

Reglas que respeta todo el código: tokens de `DESIGN.md` (los únicos hex sueltos están en `three/cookie/cookieConfig.ts`), modo claro y oscuro, voseo, sección 11 de DESIGN.md (foco visible, sin `transition: all`, imágenes con `width`/`height`, `Intl` para precios y fechas). **Ningún monto del carrito se calcula en el cliente.**

Las capturas del flujo completo (375 y 1280 px, claro y oscuro) están en [`docs/checks/`](./checks/).

## Cómo correr todo

### 1. Base de datos

```bash
docker start antua-mysql
```

### 2. Backend (`antua-api`)

```bash
cd ../antua-api
pnpm dev            # http://localhost:3000
```

Variables de `antua-api/.env` (ver `antua-api/.env.example`): `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN` y `SHIPPING_FLAT_RATE` (costo de envío fijo, hoy 1500 provisorio). Si `SHIPPING_FLAT_RATE` falta o no es un número ≥ 0, la API no arranca y dice por qué.

### 3. Frontend (`antua-web`)

```bash
cp .env.example .env    # VITE_API_URL=http://localhost:3000
pnpm install
pnpm dev                # http://localhost:5173
```

En desarrollo el front llama a `/api` y Vite reenvía a `VITE_API_URL`, porque la API no habilita CORS. En producción hace falta `app.enableCors({ origin: [...], exposedHeaders: ['X-Guest-Token'] })`.

Scripts: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### 4. Datos de prueba (opcional)

La base de desarrollo tiene datos sembrados para probar: 12 productos activos (más uno inactivo), 5 tags (`clasicas`, `sin-gluten`, `veganas`, `sin-azucar`, `packs`), variantes x1/x6/x12, reseñas, cupones `SEED10` (−10 %, mínimo $5000), `SEEDFIJO` (−$1000) y `SEEDVENCIDO`, y usuarios `seed.*@antua.test` (contraseña `SeedPass123!`).

Los scripts `seed.sql` y `seed-cleanup.sql` se perdieron con el scratchpad de la sesión; los datos siguen en la base. Si hacen falta otra vez, hay que regenerarlos en `antua-api/seed/`. Todo lo sembrado lleva el prefijo `seed-`/`SEED` para borrarlo sin tocar datos reales.

## Qué falta

- **Checkout** en 4 pasos (dirección, envío, pago, confirmación) con guest checkout. Es la próxima fase.
- **"Mis pedidos"** y el disparo automático del AuthModal al entrar sin sesión.
- **Recuperar contraseña**: el link existe, pero solo informa; no hay endpoint.
- **Formulario de reseñas**: el backend solo permite reseñar después de una compra entregada.
- Borrar a mano los restos del template de Vite: `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`.

## Decisiones abiertas

1. ~~**Productos inactivos en `GET /products/:slug`.**~~ Resuelto el 17/10: el backend responde 404 (ver `progreso.md`).
2. **Filtros del lado cliente.** `GET /products` no acepta filtros, orden ni paginación. Hoy se resuelve en `lib/shopQuery.ts` sobre la lista completa; cuando el backend acepte parámetros, solo cambia `api/products.ts`.
3. **Merge de carritos.** Funciona (`POST /cart/merge`). Desde el 17/10 conserva los ítems cuando hay cupón y corre en una transacción. Queda abierto avisar al usuario cuando se quita un cupón por no llegar al mínimo (hoy desaparece en silencio).
4. **Login con Google.** Fuera del alcance hasta que se decida (TODO en `AuthModal.tsx`).
5. **"Mis pedidos".** Sin pantalla ni ruta todavía.
6. **Checkout.** Pendiente: el valor real de `SHIPPING_FLAT_RATE` (hoy 1500), el flujo de pago, si se ofrece registrarse al final (guest checkout, DESIGN.md §4) y qué precio cobra `POST /orders` (hoy el actual de la variante, no el snapshot del carrito).
7. **Footer oscuro vs. surface.** Sigue el wireframe (`#2E2D2C`); DESIGN.md §12 lo deja abierto.
8. **Flotación de la galleta 3D sin control de pausa.** Se detiene con reduced motion y fuera de pantalla, pero WCAG 2.2.2 pide pausa para movimiento de más de 5 s.
9. **JWT en localStorage.** Simple para una SPA; la alternativa más segura es una cookie httpOnly (requiere cambios en el backend).
10. **Tests del backend.** Las 20 suites pasan desde el 17/10, pero son pruebas mínimas ("should be defined"): no hay tests de la lógica del carrito ni de las órdenes.
