import { formatPrice } from './format'
import type { CartWarning } from '../types/cart'

/**
 * Traduce los mensajes del carrito del backend (sin tildes y sin próximo paso)
 * a algo accionable en español. Si no reconoce el mensaje, lo devuelve tal cual.
 */
export function couponErrorMessage(message: string): string {
  const minimum = /monto minimo de\s*([\d.]+)/i.exec(message)
  if (minimum?.[1]) {
    const amount = Number(minimum[1])
    return Number.isFinite(amount)
      ? `Este cupón pide una compra mínima de ${formatPrice(amount)}. Sumá algo más para usarlo.`
      : 'Este cupón pide una compra mínima. Sumá algo más para usarlo.'
  }
  if (/no es valido o no existe/i.test(message)) return 'Ese cupón no existe o ya no está activo. Revisá cómo lo escribiste.'
  if (/expirado|no vigente/i.test(message)) return 'Ese cupón está vencido o todavía no está vigente.'
  if (/limite de uso/i.test(message)) return 'Ese cupón ya alcanzó su límite de usos.'
  return message
}

/** Aviso accionable de algo que el backend cambió en el carrito. */
export const cartWarningMessage = (warning: CartWarning): string =>
  `Quitamos el cupón ${warning.couponCode} porque tu compra ya no llega al mínimo de ${formatPrice(warning.minAmount)}. Si sumás algo más, podés volver a aplicarlo.`

export function cartItemErrorMessage(message: string): string {
  if (/stock insuficiente/i.test(message)) return 'No hay tantas unidades disponibles. Probá con menos.'
  if (/no exise|no se encontro el item/i.test(message)) return 'Ese producto ya no está en tu carrito. Actualizamos la lista.'
  return message
}
