import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { ContentPage } from '../../components/layout/ContentPage'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { CONTACT_EMAIL } from '../../data/site'

interface Group {
  id: string
  title: string
  questions: { q: string; a: ReactNode }[]
}

/**
 * Texto: docs/contenido-sitio.md §2. Pagos usa la variante B (pago a coordinar): sin credenciales de
 * Mercado Pago, el checkout registra el pedido y el pago se coordina aparte. Si se activa el pago
 * online, cambiar por la variante A.
 */
const GROUPS: Group[] = [
  {
    id: 'pedidos-y-envios',
    title: 'Pedidos y envíos',
    questions: [
      {
        q: '¿Necesito una cuenta para comprar?',
        a: 'No. Podés comprar como invitado. Si creás una cuenta, vas a poder ver tus pedidos, guardar direcciones y dejar reseñas.',
      },
      {
        q: '¿Cuánto cuesta el envío?',
        a: 'El envío tiene un costo fijo que ves en el carrito antes de confirmar el pedido. Siempre lo vas a ver junto al total.',
      },
      {
        q: '¿Cuánto tarda en llegar mi pedido?',
        a: 'El plazo estimado aparece en el carrito y en el checkout. Si todavía no lo ves, escribinos y te lo confirmamos.',
      },
      {
        q: '¿Puedo cambiar o cancelar mi pedido?',
        a: 'Escribinos lo antes posible, con tu número de pedido. Si todavía no empezamos a prepararlo, lo cambiamos o lo cancelamos.',
      },
    ],
  },
  {
    id: 'pagos',
    title: 'Pagos',
    questions: [
      {
        q: '¿Cómo pago mi pedido?',
        a: 'Por ahora, tu pedido queda registrado como pendiente y nos ponemos en contacto para coordinar el pago. El pago online está en preparación.',
      },
      {
        q: '¿Qué pasa si el precio cambia mientras compro?',
        a: 'Antes de crear tu pedido comparamos el precio que viste en el carrito con el actual. Si cambió, te avisamos y te pedimos que lo confirmes de nuevo. Nunca te cobramos un precio distinto sin avisarte.',
      },
      {
        q: '¿Puedo usar un cupón?',
        a: 'Sí. Ingresá el código en el carrito. Algunos cupones tienen un monto mínimo de compra, fecha de vencimiento o un límite de usos, y te lo indicamos si no se pueden aplicar.',
      },
    ],
  },
  {
    id: 'ingredientes-y-alergenos',
    title: 'Ingredientes y alérgenos',
    questions: [
      {
        q: '¿Dónde veo los ingredientes y alérgenos?',
        a: 'En la página de cada producto, siempre visibles: ingredientes, alérgenos e información nutricional (por ahora, de ejemplo).',
      },
      {
        q: '¿Las galletas “sin gluten” son aptas para celíacos?',
        a: 'Las elaboramos sin ingredientes que contengan gluten. Si tenés celiaquía o una alergia grave, revisá la lista de ingredientes y alérgenos de cada producto y escribinos antes de comprar, para que te contemos cómo trabajamos.',
      },
      {
        q: '¿Qué significa “sin azúcar”?',
        a: 'Que no llevan azúcar agregada. Pueden contener edulcorantes y polialcoholes, que se indican en los ingredientes. En exceso, los polialcoholes pueden tener efecto laxante.',
      },
      {
        q: '¿Las veganas tienen algún ingrediente de origen animal?',
        a: 'No. No llevan huevo, lácteos ni miel. Revisá igualmente la lista de ingredientes de cada producto.',
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta',
    questions: [
      {
        q: 'Olvidé mi contraseña, ¿qué hago?',
        a: (
          <>
            En “Iniciar sesión” tocá <Link to="/olvide-mi-contrasena">“¿Olvidaste tu contraseña?”</Link> y seguí los pasos. Te mandamos un enlace de un
            solo uso, con vencimiento. (En este proyecto de práctica el correo todavía no se envía de verdad.)
          </>
        ),
      },
      {
        q: '¿Puedo borrar mi cuenta o mis datos?',
        a: (
          <>
            Sí. Escribinos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> y lo gestionamos. Mirá más detalle en la{' '}
            <Link to="/privacidad">Política de privacidad</Link>.
          </>
        ),
      },
    ],
  },
  {
    id: 'cambios-y-devoluciones',
    title: 'Cambios y devoluciones',
    questions: [
      {
        q: '¿Puedo devolver mis galletas?',
        a: 'Por ser alimentos, no aceptamos devoluciones salvo que el producto llegue dañado o haya un error nuestro. Escribinos dentro de las 48 horas de recibido, con tu número de pedido y una foto, y lo resolvemos.',
      },
    ],
  },
]

/** Acordeón nativo con <details>: funciona con teclado (Enter/Espacio) y anuncia abierto o cerrado. */
export default function Faq() {
  return (
    <ContentPage title="Preguntas frecuentes" description="Respuestas sobre pedidos, envíos, pagos, ingredientes y alérgenos de Antojarte.">
      {GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={group.id} className="flex flex-col gap-3">
          <h2 id={group.id}>{group.title}</h2>
          {group.questions.map(({ q, a }) => (
            <details key={q} className="group rounded-card bg-surface dark:bg-dark-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="px-5 pb-5 text-text-main/85 dark:text-dark-text-secondary">{a}</div>
            </details>
          ))}
        </section>
      ))}
      <section aria-labelledby="mas-ayuda" className="mt-6 rounded-card bg-accent-secondary p-6 text-center dark:bg-dark-card">
        <h2 id="mas-ayuda" className="!mt-0">
          ¿No encontraste lo que buscabas?
        </h2>
        <div className="mt-4">
          <ButtonLink to="/contacto">Escribinos</ButtonLink>
        </div>
      </section>
    </ContentPage>
  )
}
