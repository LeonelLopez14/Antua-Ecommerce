import { ChevronDown } from 'lucide-react'
import { ContentPage } from '../../components/layout/ContentPage'

// TODO(contenido): confirmar zonas de envío, plazos y política de alérgenos con el negocio.
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: '¿Cómo es el envío?',
    a: 'Tenemos un único método: envío a domicilio con una tarifa fija, que ves en el carrito y en el checkout antes de confirmar. Después del pedido te escribimos para coordinar el día y el horario.',
  },
  {
    q: '¿Cuánto tarda en llegar mi pedido?',
    a: 'Horneamos en tandas chicas, así que el plazo depende de la próxima horneada. Te lo confirmamos cuando coordinamos la entrega.',
  },
  {
    q: '¿Cómo pago?',
    a: 'El pago online llega pronto. Por ahora registrás el pedido en la web y te contactamos para coordinar el pago.',
  },
  {
    q: '¿Las galletas tienen alérgenos?',
    a: 'Cada ficha de producto lista los ingredientes y los alérgenos. Las opciones sin gluten se preparan por separado, pero si tenés una alergia severa escribinos antes de pedir.',
  },
  {
    q: '¿Cuánto duran y cómo se guardan?',
    a: 'Recién horneadas son mejores, pero se conservan varios días en un recipiente cerrado, lejos del calor.',
  },
  {
    q: '¿Necesito una cuenta para comprar?',
    a: 'No. Podés comprar como invitado. Con una cuenta guardás tus direcciones y ves tus pedidos en “Mis pedidos”.',
  },
]

export default function Faq() {
  return (
    <ContentPage title="Preguntas frecuentes" intro="Envíos, pagos, alérgenos y tiempos de entrega.">
      <div className="flex flex-col gap-3">
        {QUESTIONS.map(({ q, a }) => (
          <details key={q} className="group rounded-card bg-surface dark:bg-dark-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-text-main/85 dark:text-dark-text-secondary">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  )
}
