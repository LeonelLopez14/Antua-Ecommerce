import { ContentPage } from '../../components/layout/ContentPage'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { FICTIONAL_BRAND_NOTE } from '../../data/site'

// Texto: docs/contenido-sitio.md §1. Adaptado a la tienda real (ver progreso.md, Fase 13).
export default function About() {
  return (
    <ContentPage
      title="Galletas hechas para darte un gustito"
      description="Conocé Antojarte: galletas caseras artesanales, con opciones sin gluten, veganas y sin azúcar, hechas en tandas chicas."
      footnote={FICTIONAL_BRAND_NOTE}
    >
      <p>
        <span translate="no">Antojarte</span> nació en una cocina de barrio, con una idea simple: que todas las personas puedan darse el gusto de una buena
        galleta, sin importar qué comen.
      </p>
      <p>
        Empezamos horneando tandas chicas para amigos y familia. Había quien no podía comer gluten, quien no come productos de origen animal y quien cuida
        el azúcar. Así que aprendimos a hacer galletas para cada uno, sin que ninguna se sienta “la opción de menos sabor”.
      </p>
      <h2>Cómo trabajamos</h2>
      <ul>
        <li>
          <strong>Tandas chicas.</strong> Horneamos pocas galletas a la vez, para que lleguen frescas.
        </li>
        <li>
          <strong>Ingredientes que podés leer.</strong> Cada producto muestra sus ingredientes y alérgenos completos. Si no lo entendés, no lo ponemos.
        </li>
        <li>
          <strong>Opciones para más gente.</strong> Tenemos galletas clásicas, sin gluten, veganas y sin azúcar.
        </li>
        <li>
          <strong>Regalar también es parte del antojo.</strong> Cada galleta viene de a 1, en caja de 6 o en caja de 12, para compartir o para regalar.
        </li>
      </ul>
      <p>
        <strong>Nuestras categorías:</strong> Clásicas, Sin gluten, Veganas, Sin azúcar y Packs.
      </p>
      <blockquote className="border-l-4 border-accent-main pl-4 font-display text-2xl italic dark:border-dark-accent-main">Date un gustito, llevate un antojo.</blockquote>
      <div className="mt-4">
        <ButtonLink to="/tienda">Ver las galletas</ButtonLink>
      </div>
    </ContentPage>
  )
}
