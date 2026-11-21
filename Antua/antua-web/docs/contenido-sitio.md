# Contenido del sitio — Antojarte

Textos listos para integrar en las páginas del sitio. Voz: voseo rioplatense, cálida y cercana, frases cortas. Antojarte es una marca ficticia de un proyecto de práctica.

**Notas para quien integre estos textos (Claude Code):**
- Verificá cada afirmación contra el comportamiento real de la app (envío, pagos, datos que se guardan, cookies y almacenamiento local). Si algo no coincide, adaptá el texto y anotá el cambio en docs/progreso.md. No dejes promesas que el sitio no cumple.
- Los dominios y correos son de ejemplo (`.example`, dominio reservado): no los cambies por dominios reales.
- No se inventan teléfonos, direcciones, números de registro ni datos fiscales.

---

## 1. Nosotros

- Ruta: `/nosotros`
- Título (h1): Galletas hechas para darte un gustito
- Meta description: Conocé Antojarte: galletas caseras artesanales, con opciones sin gluten, veganas y sin azúcar, hechas en tandas chicas.

### Cuerpo

Antojarte nació en una cocina de barrio, con una idea simple: que todas las personas puedan darse el gusto de una buena galleta, sin importar qué comen.

Empezamos horneando tandas chicas para amigos y familia. Había quien no podía comer gluten, quien no come productos de origen animal y quien cuida el azúcar. Así que aprendimos a hacer galletas para cada uno, sin que ninguna se sienta "la opción de menos sabor".

**Cómo trabajamos**

- **Tandas chicas.** Horneamos pocas galletas a la vez, para que lleguen frescas.
- **Ingredientes que podés leer.** Cada producto muestra sus ingredientes y alérgenos completos. Si no lo entendés, no lo ponemos.
- **Opciones para más gente.** Tenemos galletas clásicas, sin gluten, veganas, sin azúcar y de temporada.
- **Regalar también es parte del antojo.** Armamos packs de 1, 6 y 12 unidades para compartir, o para regalar.

**Nuestras categorías:** Clásicas, Sin gluten, Veganas, Sin azúcar, De temporada y Packs / regalos.

> Date un gustito, llevate un antojo.

Botón final: **Ver las galletas** → `/tienda`

Nota al pie (pequeña): Antojarte es una marca ficticia creada para un proyecto de práctica.

---

## 2. Preguntas frecuentes

- Ruta: `/preguntas-frecuentes`
- Título (h1): Preguntas frecuentes
- Meta description: Respuestas sobre pedidos, envíos, pagos, ingredientes y alérgenos de Antojarte.
- Formato: acordeón accesible (botones con `aria-expanded`, o `<details>`), agrupado por tema con encabezados `h2`.

### Pedidos y envíos

**¿Necesito una cuenta para comprar?**
No. Podés comprar como invitado. Si creás una cuenta, vas a poder ver tus pedidos, guardar direcciones y dejar reseñas.

**¿Cuánto cuesta el envío?**
El envío tiene un costo fijo que ves en el carrito antes de confirmar el pedido. Siempre lo verás junto al total.

**¿Cuánto tarda en llegar mi pedido?**
El plazo estimado aparece en el carrito y en el checkout. Si todavía no lo ves, escribinos y te lo confirmamos.

**¿Puedo cambiar o cancelar mi pedido?**
Escribinos lo antes posible, con tu número de pedido. Si todavía no empezamos a prepararlo, lo cambiamos o lo cancelamos.

### Pagos

(Usar la variante que corresponda al estado real del sitio.)

**Variante B, estado actual (pago a coordinar):**
**¿Cómo pago mi pedido?**
Por ahora, tu pedido queda registrado como pendiente y nos ponemos en contacto para coordinar el pago. El pago online está en preparación.

**Variante A, cuando el pago online esté activo:**
**¿Cómo pago mi pedido?**
Pagás online a través de Mercado Pago. Nunca pedimos ni guardamos los datos de tu tarjeta: el pago se hace en la página del proveedor.

**¿Qué pasa si el precio cambia mientras compro?**
Antes de crear tu pedido comparamos el precio que viste en el carrito con el actual. Si cambió, te avisamos y te pedimos que lo confirmes de nuevo. Nunca te cobramos un precio distinto sin avisarte.

**¿Puedo usar un cupón?**
Sí. Ingresá el código en el carrito. Algunos cupones tienen un monto mínimo de compra, fecha de vencimiento o un límite de usos, y te lo indicamos si no se pueden aplicar.

### Ingredientes y alérgenos

**¿Dónde veo los ingredientes y alérgenos?**
En la página de cada producto, siempre visibles: ingredientes, alérgenos e información nutricional.

**¿Las galletas "sin gluten" son aptas para celíacos?**
Las elaboramos sin ingredientes que contengan gluten. Si tenés celiaquía o una alergia grave, revisá la lista de ingredientes y alérgenos de cada producto y escribinos antes de comprar, para que te contemos cómo trabajamos.

**¿Qué significa "sin azúcar"?**
Que no llevan azúcar agregada. Pueden contener edulcorantes y polialcoholes, que se indican en los ingredientes. En exceso, los polialcoholes pueden tener efecto laxante.

**¿Las veganas tienen algún ingrediente de origen animal?**
No. No llevan huevo, lácteos ni miel. Revisá igualmente la lista de ingredientes de cada producto.

### Cuenta

**Olvidé mi contraseña, ¿qué hago?**
En "Iniciar sesión" tocá "¿Olvidaste tu contraseña?" y seguí los pasos. Te mandamos un enlace de un solo uso, con vencimiento.

**¿Puedo borrar mi cuenta o mis datos?**
Sí. Escribinos a contacto@antojarte.example y lo gestionamos. Mirá más detalle en la Política de privacidad.

### Cambios y devoluciones

**¿Puedo devolver mis galletas?**
Por ser alimentos, no aceptamos devoluciones salvo que el producto llegue dañado o haya un error nuestro. Escribinos dentro de las 48 horas de recibido, con tu número de pedido y una foto, y lo resolvemos.

Cierre: **¿No encontraste lo que buscabas?** → Botón **Escribinos** → `/contacto`

---

## 3. Contacto

- Ruta: `/contacto`
- Título (h1): Contacto
- Meta description: Escribinos a Antojarte por pedidos, consultas, alérgenos o sugerencias. Respondemos en 1 o 2 días hábiles.

### Cuerpo

¿Tenés una consulta sobre un pedido, un ingrediente o una idea para una galleta nueva? Escribinos.

- **Correo:** contacto@antojarte.example
- **Horario de respuesta:** de lunes a viernes, de 9 a 18 h (hora de Montevideo).
- **Tiempo de respuesta:** 1 o 2 días hábiles.

**Para ayudarte más rápido, incluí:**
- Tu número de pedido, si es sobre una compra.
- El nombre del producto, si es sobre ingredientes o alérgenos.
- Una foto, si recibiste algo dañado.

(No agregar formulario de contacto: no existe endpoint. Si se agrega más adelante, actualizar esta página.)

Nota al pie (pequeña): Antojarte es una marca ficticia creada para un proyecto de práctica; el correo es de ejemplo.

---

## 4. Términos y condiciones

- Ruta: `/terminos`
- Título (h1): Términos y condiciones
- Meta description: Condiciones de uso del sitio y de compra en Antojarte.
- Banner visible arriba (aviso): **Borrador de práctica.** Este texto es un ejemplo para un proyecto sin fines comerciales. No es asesoramiento legal ni un documento vinculante.

### Cuerpo

**1. Aceptación**
Al usar este sitio o hacer un pedido, aceptás estos términos. Si no estás de acuerdo, no uses el sitio.

**2. Sobre este sitio**
Antojarte es una marca ficticia y este sitio es un proyecto de práctica. Los pedidos que se hagan aquí no corresponden a una venta real salvo que se indique lo contrario.

**3. Productos y precios**
Los precios se muestran en pesos uruguayos (UYU). El precio que se aplica a tu pedido es el que confirmás antes de crearlo. Si el precio cambia mientras comprás, te lo avisamos y te pedimos que lo confirmes de nuevo.

**4. Pedidos**
Tu pedido se registra cuando completás el checkout. Podemos rechazar o cancelar un pedido por falta de stock, errores evidentes de precio o datos incompletos. Si pasa, te avisamos y devolvemos lo que hayas pagado.

**5. Pagos**
El pago se realiza por los medios que el sitio ofrezca en cada momento. No almacenamos datos de tarjetas.

**6. Envíos**
El envío tiene un costo fijo informado antes de confirmar el pedido. Los plazos son estimados y pueden variar. Es tu responsabilidad ingresar una dirección correcta.

**7. Cambios y devoluciones**
Por tratarse de alimentos, no aceptamos devoluciones salvo producto dañado o error nuestro, reportado dentro de las 48 horas de recibido, con foto y número de pedido.

**8. Ingredientes, alérgenos e información nutricional**
Publicamos los ingredientes y alérgenos de cada producto. Si tenés una alergia o una condición que requiera cuidado, revisalos antes de comprar y consultanos ante cualquier duda. La información nutricional puede ser orientativa.

**9. Tu cuenta**
Sos responsable de la confidencialidad de tu contraseña y de lo que se haga con tu cuenta. Avisanos si creés que alguien la usó sin permiso.

**10. Reseñas**
Solo podés reseñar productos que compraste y recibiste. Podemos ocultar reseñas que sean ofensivas, falsas o ajenas al producto.

**11. Propiedad intelectual**
Los textos, imágenes, diseños y la marca de este sitio pertenecen al proyecto y no se pueden usar sin permiso.

**12. Limitación de responsabilidad**
Hacemos lo posible para que el sitio funcione bien, pero no garantizamos que esté disponible sin interrupciones ni libre de errores.

**13. Cambios en estos términos**
Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha de última actualización.

**14. Ley aplicable y contacto**
Estos términos se interpretan según las leyes de Uruguay. Para consultas: contacto@antojarte.example.

Fecha de última actualización: (usar la fecha de publicación real al integrar).

---

## 5. Política de privacidad

- Ruta: `/privacidad`
- Título (h1): Política de privacidad
- Meta description: Qué datos personales recolecta Antojarte, para qué los usa y cómo podés ejercer tus derechos.
- Banner visible arriba (aviso): **Borrador de práctica.** Este texto es un ejemplo para un proyecto sin fines comerciales. No es asesoramiento legal ni un documento vinculante. Antes de usar un texto así en un negocio real, revisalo con un profesional.

### Cuerpo

**1. Qué datos recolectamos**
- **Cuenta:** nombre, correo electrónico y contraseña (guardada de forma cifrada, nunca en texto plano).
- **Pedidos:** nombre, correo, teléfono, dirección de entrega, productos, montos y estado del pedido.
- **Reseñas:** el contenido de tu reseña y tu nombre visible.
- **Técnicos:** un identificador de carrito y tu sesión, guardados en el almacenamiento local de tu navegador, y tu preferencia de tema (claro u oscuro).
- **Newsletter:** tu correo, si te suscribís.

**2. Para qué los usamos**
- Procesar y entregar tus pedidos y avisarte sobre su estado.
- Mantener tu cuenta y tu carrito.
- Responder tus consultas.
- Mejorar el sitio.

No vendemos tus datos. No usamos cookies de publicidad ni de seguimiento.

**3. Con quién los compartimos**
Solo con proveedores necesarios para operar: el proveedor de pagos (cuando el pago online esté activo) y el servicio de envío de correos. Cada uno recibe solo lo necesario.

**4. Cuánto tiempo los conservamos**
Conservamos tus datos mientras tengas una cuenta o mientras sea necesario para cumplir obligaciones sobre tus pedidos. Si pedís borrar tu cuenta, eliminamos o anonimizamos tus datos personales, salvo lo que debamos conservar por obligación.

**5. Tus derechos**
Podés pedir acceder a tus datos, rectificarlos, actualizarlos, incluirlos o suprimirlos, conforme a la normativa uruguaya de protección de datos personales (Ley N.º 18.331). Escribinos a contacto@antojarte.example.

**6. Seguridad**
Guardamos las contraseñas cifradas, limitamos los intentos de acceso y restringimos quién puede ver los datos de pedidos y cuentas. Ningún sistema es 100 % seguro, y por eso te recomendamos usar una contraseña única.

**7. Menores**
El sitio no está dirigido a menores de edad. Si creés que un menor nos dio datos, escribinos y los eliminamos.

**8. Cambios**
Podemos actualizar esta política. La versión vigente es la publicada aquí, con su fecha de última actualización.

**9. Contacto**
contacto@antojarte.example

Fecha de última actualización: (usar la fecha de publicación real al integrar).

---

## 6. Información nutricional y ingredientes de EJEMPLO

Valores inventados para el proyecto de práctica. Cada galleta pesa 40 g. Valores por 100 g y por unidad.

En la ficha de producto, junto a la tabla, mostrar siempre esta nota: **"Información nutricional de ejemplo (proyecto de práctica). No corresponde a un producto real."**

| Categoría | Energía 100 g | Energía unidad | Carbohidratos (unidad) | de los cuales azúcares (unidad) | Grasas (unidad) | de las cuales saturadas (unidad) | Proteínas (unidad) | Fibra (unidad) | Sodio (unidad) |
|---|---|---|---|---|---|---|---|---|---|
| Clásicas | 480 kcal | 192 kcal | 24,0 g | 12,0 g | 9,2 g | 4,8 g | 2,0 g | 0,8 g | 88 mg |
| Sin gluten | 470 kcal | 188 kcal | 22,0 g | 11,2 g | 10,0 g | 3,6 g | 2,4 g | 1,6 g | 72 mg |
| Veganas | 460 kcal | 184 kcal | 24,8 g | 11,6 g | 8,4 g | 4,0 g | 1,6 g | 1,2 g | 80 mg |
| Sin azúcar | 400 kcal | 160 kcal | 20,8 g | 0,8 g | 8,8 g | 4,4 g | 2,4 g | 2,4 g | 80 mg |
| De temporada | usar los valores de "Clásicas" | | | | | | | | |

Los packs (x1, x6, x12) usan los valores por unidad del producto; el total del pack es la unidad multiplicada por la cantidad.

### Ingredientes y alérgenos de ejemplo por categoría

- **Clásicas:** harina de trigo, manteca, azúcar, huevo, chips de chocolate, esencia de vainilla, polvo de hornear, sal. Alérgenos: gluten (trigo), lácteos, huevo, puede contener frutos secos y soja.
- **Sin gluten:** harina de arroz, almidón de maíz, harina de almendras, manteca, azúcar, huevo, chips de chocolate, esencia de vainilla, sal. Alérgenos: lácteos, huevo, frutos secos (almendras), puede contener soja.
- **Veganas:** harina de trigo, aceite de coco, azúcar, bebida de avena, chips de chocolate sin lácteos, esencia de vainilla, polvo de hornear, sal. Alérgenos: gluten (trigo), avena; puede contener frutos secos y soja.
- **Sin azúcar:** harina de trigo, manteca, eritritol, huevo, chips de chocolate sin azúcar, esencia de vainilla, polvo de hornear, sal. Alérgenos: gluten (trigo), lácteos, huevo, puede contener frutos secos y soja. Contiene polialcoholes: en exceso puede tener efecto laxante.

Regla de carga: completar SOLO los campos vacíos de productos existentes (según su categoría o tag principal); no sobrescribir ingredientes ni alérgenos que ya estén cargados. Hacer respaldo de la base antes y dejar un script reversible.
