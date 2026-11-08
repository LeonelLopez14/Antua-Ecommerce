import { ContentPage } from '../../components/layout/ContentPage'

// TODO(legal): reemplazar por la política revisada por un profesional antes de publicar el sitio.
export default function Privacy() {
  return (
    <ContentPage title="Política de privacidad" intro="Qué datos pedimos y para qué los usamos.">
      <h2>Qué datos pedimos</h2>
      <ul>
        <li>Para comprar: nombre, email, teléfono y dirección de entrega.</li>
        <li>Si te creás una cuenta: además, una contraseña (la guardamos cifrada) y tus direcciones.</li>
      </ul>
      <h2>Para qué los usamos</h2>
      <p>Solo para preparar, cobrar y entregar tus pedidos, y para responder tus consultas. No vendemos tus datos.</p>
      <h2>Qué guarda tu navegador</h2>
      <p>Guardamos en tu navegador tu sesión y un identificador del carrito, para que no pierdas lo que elegiste.</p>
      <h2>Tus derechos</h2>
      <p>Podés pedirnos ver, corregir o borrar tus datos escribiendo a hola@antua.com.ar.</p>
    </ContentPage>
  )
}
