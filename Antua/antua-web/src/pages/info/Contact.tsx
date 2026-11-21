import { Clock, Mail, Timer } from 'lucide-react'
import { ContentPage } from '../../components/layout/ContentPage'
import { CONTACT_EMAIL, FICTIONAL_BRAND_NOTE } from '../../data/site'

// Texto: docs/contenido-sitio.md §3. Sin formulario: no hay endpoint de contacto.
export default function Contact() {
  return (
    <ContentPage
      title="Contacto"
      description="Escribinos a Antojarte por pedidos, consultas, alérgenos o sugerencias. Respondemos en 1 o 2 días hábiles."
      intro={<p>¿Tenés una consulta sobre un pedido, un ingrediente o una idea para una galleta nueva? Escribinos.</p>}
      footnote={`${FICTIONAL_BRAND_NOTE} El correo es de ejemplo.`}
    >
      <ul className="!list-none !pl-0 !gap-4">
        <li className="flex items-start gap-3">
          <Mail aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Correo</p>
            <a href={`mailto:${CONTACT_EMAIL}`} translate="no">
              {CONTACT_EMAIL}
            </a>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Clock aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Horario de respuesta</p>
            <p>De lunes a viernes, de 9 a 18&nbsp;h (hora de Montevideo).</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Timer aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Tiempo de respuesta</p>
            <p>1 o 2 días hábiles.</p>
          </div>
        </li>
      </ul>
      <h2>Para ayudarte más rápido, incluí:</h2>
      <ul>
        <li>Tu número de pedido, si es sobre una compra.</li>
        <li>El nombre del producto, si es sobre ingredientes o alérgenos.</li>
        <li>Una foto, si recibiste algo dañado.</li>
      </ul>
    </ContentPage>
  )
}
