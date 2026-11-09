import { ContentPage } from '../../components/layout/ContentPage'

// TODO(legal): reemplazar por los términos revisados por un profesional antes de publicar el sitio.
export default function Terms() {
  return (
    <ContentPage title="Términos y condiciones" intro="Las reglas para comprar en Antua.">
      <h2>Pedidos</h2>
      <p>
        Cuando confirmás un pedido, lo registramos con los precios y el stock de ese momento. Te contactamos para coordinar el pago y la
        entrega.
      </p>
      <h2>Precios y envío</h2>
      <p>Los precios están en pesos argentinos. El envío tiene una tarifa fija que ves antes de confirmar.</p>
      <h2>Cupones</h2>
      <p>Cada cupón tiene vigencia y, a veces, un monto mínimo de compra. Si tu carrito deja de cumplirlo, el cupón se quita.</p>
      <h2>Cambios y cancelaciones</h2>
      <p>Si necesitás cambiar o cancelar un pedido, escribinos lo antes posible: las galletas se hornean para cada tanda.</p>
    </ContentPage>
  )
}
