import { LegalPage, type LegalSection } from '../../components/layout/LegalPage'
import { CONTACT_EMAIL } from '../../data/site'

/**
 * Texto: docs/contenido-sitio.md §5, verificado contra la app (ver progreso.md, Fase 13):
 * no hay cookies; localStorage guarda la sesión (`antua.auth`), el carrito de invitado y el tema;
 * sessionStorage, la referencia del último pedido; los mails todavía no se envían.
 */
const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

const SECTIONS: LegalSection[] = [
  {
    id: 'que-datos',
    title: 'Qué datos recolectamos',
    body: (
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo electrónico, teléfono (si lo cargás), las direcciones que guardes y tu contraseña, que se guarda protegida
          con un algoritmo de hash, nunca en texto plano.
        </li>
        <li>
          <strong>Pedidos:</strong> nombre, correo, teléfono, dirección de entrega, productos, montos y estado del pedido.
        </li>
        <li>
          <strong>Reseñas:</strong> el contenido de tu reseña y tu nombre visible.
        </li>
        <li>
          <strong>En tu navegador:</strong> no usamos cookies. En el almacenamiento local guardamos tu sesión (con tu nombre y correo, si iniciaste sesión),
          un identificador de carrito y tu preferencia de tema (claro u oscuro). Mientras comprás, el almacenamiento de la pestaña guarda una referencia a tu
          último pedido. Todo se borra al cerrar sesión o al limpiar los datos del sitio.
        </li>
        <li>
          <strong>Newsletter:</strong> tu correo, si te suscribís.
        </li>
      </ul>
    ),
  },
  {
    id: 'para-que',
    title: 'Para qué los usamos',
    body: (
      <>
        <ul>
          <li>Procesar y entregar tus pedidos y avisarte sobre su estado.</li>
          <li>Mantener tu cuenta y tu carrito.</li>
          <li>Responder tus consultas.</li>
          <li>Mejorar el sitio.</li>
        </ul>
        <p>No vendemos tus datos. No usamos cookies de publicidad ni de seguimiento.</p>
      </>
    ),
  },
  {
    id: 'con-quien',
    title: 'Con quién los compartimos',
    body: (
      <p>
        Solo con proveedores necesarios para operar, cuando estén activos: el proveedor de pagos y el servicio de envío de correos. Hoy ninguno de los dos
        está conectado. Cada uno recibe solo lo necesario.
      </p>
    ),
  },
  {
    id: 'cuanto-tiempo',
    title: 'Cuánto tiempo los conservamos',
    body: (
      <p>
        Conservamos tus datos mientras tengas una cuenta o mientras sea necesario para cumplir obligaciones sobre tus pedidos. Si pedís borrar tu cuenta,
        eliminamos o anonimizamos tus datos personales, salvo lo que debamos conservar por obligación.
      </p>
    ),
  },
  {
    id: 'tus-derechos',
    title: 'Tus derechos',
    body: (
      <p>
        Podés pedir acceder a tus datos, rectificarlos, actualizarlos, incluirlos o suprimirlos, conforme a la normativa uruguaya de protección de datos
        personales (Ley N.º&nbsp;18.331). Escribinos a {mail}.
      </p>
    ),
  },
  {
    id: 'seguridad',
    title: 'Seguridad',
    body: (
      <p>
        Guardamos las contraseñas protegidas con hash, limitamos los intentos de acceso y restringimos quién puede ver los datos de pedidos y cuentas.
        Ningún sistema es 100&nbsp;% seguro, y por eso te recomendamos usar una contraseña única.
      </p>
    ),
  },
  {
    id: 'menores',
    title: 'Menores',
    body: <p>El sitio no está dirigido a menores de edad. Si creés que un menor nos dio datos, escribinos y los eliminamos.</p>,
  },
  {
    id: 'cambios',
    title: 'Cambios',
    body: <p>Podemos actualizar esta política. La versión vigente es la publicada aquí, con su fecha de última actualización.</p>,
  },
  { id: 'contacto', title: 'Contacto', body: <p>{mail}</p> },
]

export default function Privacy() {
  return (
    <LegalPage
      title="Política de privacidad"
      description="Qué datos personales recolecta Antojarte, para qué los usa y cómo podés ejercer tus derechos."
      draftNotice={
        <p>
          <strong>Borrador de práctica.</strong> Este texto es un ejemplo para un proyecto sin fines comerciales. No es asesoramiento legal ni un documento
          vinculante. Antes de usar un texto así en un negocio real, revisalo con un profesional.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
