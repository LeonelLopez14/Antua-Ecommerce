import { Mail, MapPin } from 'lucide-react'
import { ContentPage } from '../../components/layout/ContentPage'

/** Sin formulario: el backend no tiene un endpoint de contacto. */
// TODO(contenido): reemplazar por los datos reales de contacto (mismos que en el footer).
export default function Contact() {
  return (
    <ContentPage title="Contacto" intro="¿Una consulta, un pedido especial o un regalo? Escribinos.">
      <ul className="flex flex-col gap-4">
        <li className="flex items-start gap-3">
          <Mail aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Email</p>
            <a
              href="mailto:hola@antua.com.ar"
              translate="no"
              className="rounded-sm font-bold text-accent-main underline underline-offset-4 dark:text-dark-accent-main"
            >
              hola@antua.com.ar
            </a>
            <p className="text-sm text-text-main/80 dark:text-dark-text-secondary">Si es por un pedido, sumá el número (por ejemplo, #12).</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-main dark:text-dark-accent-main" />
          <div>
            <p className="font-bold">Dónde estamos</p>
            <p>Buenos Aires, Argentina</p>
          </div>
        </li>
      </ul>
    </ContentPage>
  )
}
