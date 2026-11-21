import { LegalPage, type LegalSection } from '../../components/layout/LegalPage'
import { CONTACT_EMAIL } from '../../data/site'

// Texto: docs/contenido-sitio.md §4.
const SECTIONS: LegalSection[] = [
  { id: 'aceptacion', title: 'Aceptación', body: <p>Al usar este sitio o hacer un pedido, aceptás estos términos. Si no estás de acuerdo, no uses el sitio.</p> },
  {
    id: 'sobre-este-sitio',
    title: 'Sobre este sitio',
    body: (
      <p>
        <span translate="no">Antojarte</span> es una marca ficticia y este sitio es un proyecto de práctica. Los pedidos que se hagan aquí no corresponden
        a una venta real salvo que se indique lo contrario.
      </p>
    ),
  },
  {
    id: 'productos-y-precios',
    title: 'Productos y precios',
    body: (
      <p>
        Los precios se muestran en pesos uruguayos (UYU). El precio que se aplica a tu pedido es el que confirmás antes de crearlo. Si el precio cambia
        mientras comprás, te lo avisamos y te pedimos que lo confirmes de nuevo.
      </p>
    ),
  },
  {
    id: 'pedidos',
    title: 'Pedidos',
    body: (
      <p>
        Tu pedido se registra cuando completás el checkout. Podemos rechazar o cancelar un pedido por falta de stock, errores evidentes de precio o datos
        incompletos. Si pasa, te avisamos y devolvemos lo que hayas pagado.
      </p>
    ),
  },
  { id: 'pagos', title: 'Pagos', body: <p>El pago se realiza por los medios que el sitio ofrezca en cada momento. No almacenamos datos de tarjetas.</p> },
  {
    id: 'envios',
    title: 'Envíos',
    body: (
      <p>
        El envío tiene un costo fijo informado antes de confirmar el pedido. Los plazos son estimados y pueden variar. Es tu responsabilidad ingresar una
        dirección correcta.
      </p>
    ),
  },
  {
    id: 'cambios-y-devoluciones',
    title: 'Cambios y devoluciones',
    body: (
      <p>
        Por tratarse de alimentos, no aceptamos devoluciones salvo producto dañado o error nuestro, reportado dentro de las 48 horas de recibido, con foto y
        número de pedido.
      </p>
    ),
  },
  {
    id: 'ingredientes',
    title: 'Ingredientes, alérgenos e información nutricional',
    body: (
      <p>
        Publicamos los ingredientes y alérgenos de cada producto. Si tenés una alergia o una condición que requiera cuidado, revisalos antes de comprar y
        consultanos ante cualquier duda. La información nutricional que se muestra hoy es de ejemplo y no corresponde a un producto real.
      </p>
    ),
  },
  {
    id: 'tu-cuenta',
    title: 'Tu cuenta',
    body: (
      <p>Sos responsable de la confidencialidad de tu contraseña y de lo que se haga con tu cuenta. Avisanos si creés que alguien la usó sin permiso.</p>
    ),
  },
  {
    id: 'resenas',
    title: 'Reseñas',
    body: <p>Solo podés reseñar productos que compraste y recibiste. Podemos ocultar reseñas que sean ofensivas, falsas o ajenas al producto.</p>,
  },
  {
    id: 'propiedad-intelectual',
    title: 'Propiedad intelectual',
    body: <p>Los textos, imágenes, diseños y la marca de este sitio pertenecen al proyecto y no se pueden usar sin permiso.</p>,
  },
  {
    id: 'responsabilidad',
    title: 'Limitación de responsabilidad',
    body: <p>Hacemos lo posible para que el sitio funcione bien, pero no garantizamos que esté disponible sin interrupciones ni libre de errores.</p>,
  },
  {
    id: 'cambios',
    title: 'Cambios en estos términos',
    body: <p>Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha de última actualización.</p>,
  },
  {
    id: 'ley-y-contacto',
    title: 'Ley aplicable y contacto',
    body: (
      <p>
        Estos términos se interpretan según las leyes de Uruguay. Para consultas: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
]

export default function Terms() {
  return (
    <LegalPage
      title="Términos y condiciones"
      description="Condiciones de uso del sitio y de compra en Antojarte."
      draftNotice={
        <p>
          <strong>Borrador de práctica.</strong> Este texto es un ejemplo para un proyecto sin fines comerciales. No es asesoramiento legal ni un documento
          vinculante.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
