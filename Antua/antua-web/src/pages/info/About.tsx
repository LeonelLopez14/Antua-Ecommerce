import { ContentPage } from '../../components/layout/ContentPage'
import { ButtonLink } from '../../components/ui/ButtonLink'

// TODO(contenido): reemplazar por la historia real de la marca.
export default function About() {
  return (
    <ContentPage title="Nosotros" intro="Hechas para darte un gustito: galletas caseras, horneadas en tandas chicas.">
      <h2>Cómo empezamos</h2>
      <p>
        <span translate="no">Antua</span> nació en una cocina chica, con una receta de galletas con chips que pasó de mano en mano. Al principio horneábamos para
        amigos; después, para los amigos de los amigos.
      </p>
      <h2>Cómo horneamos</h2>
      <p>
        Hacemos galletas grandes, de a pocas por tanda, con manteca de verdad y sin apuros. Tenemos opciones sin gluten, veganas y sin azúcar,
        preparadas por separado para cuidar a quienes las necesitan.
      </p>
      <h2>Qué nos importa</h2>
      <ul>
        <li>Ingredientes simples y que se puedan nombrar.</li>
        <li>Tandas chicas, para que lleguen frescas.</li>
        <li>Que cada caja se sienta como un regalo, aunque sea para vos.</li>
      </ul>
      <div className="mt-6">
        <ButtonLink to="/tienda">Ver galletas</ButtonLink>
      </div>
    </ContentPage>
  )
}
