import { EMAIL_PATTERN } from './authMessages'

export const CHECKOUT_STEPS = ['Dirección', 'Envío', 'Pago', 'Confirmación'] as const
export type CheckoutStep = 1 | 2 | 3 | 4

/** Datos del paso "Dirección". Coinciden con el body de POST /orders. */
export interface CheckoutForm {
  email: string
  fullName: string
  phone: string
  street: string
  city: string
  postalCode: string
}

export type CheckoutField = keyof CheckoutForm
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
  email: '',
  fullName: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
}

/** Orden visual de los campos: el foco va al primero con error. */
export const CHECKOUT_FIELD_ORDER: CheckoutField[] = ['email', 'fullName', 'phone', 'street', 'city', 'postalCode']

/** Largos máximos de las columnas de `orders` (order.entity.ts). */
export const CHECKOUT_MAX_LENGTH: Record<CheckoutField, number> = {
  email: 150,
  fullName: 200,
  phone: 50,
  street: 200,
  city: 100,
  postalCode: 20,
}

const MESSAGES: Record<CheckoutField, string> = {
  email: 'Escribí un email válido, por ejemplo nombre@mail.com.',
  fullName: 'Escribí el nombre de quien recibe el pedido.',
  phone: 'Escribí un teléfono con código de área, por ejemplo 11 5555 4444.',
  street: 'Escribí la calle y el número.',
  city: 'Escribí la ciudad o localidad.',
  postalCode: 'Escribí el código postal, por ejemplo 1405 o C1405ABC.',
}

/** Valida el paso de dirección. `needsEmail`: solo los invitados escriben su email. */
export function validateCheckoutForm(form: CheckoutForm, needsEmail: boolean): CheckoutErrors {
  const errors: CheckoutErrors = {}
  if (needsEmail && !EMAIL_PATTERN.test(form.email.trim())) errors.email = MESSAGES.email
  if (form.fullName.trim().length < 2) errors.fullName = MESSAGES.fullName
  if (form.phone.replace(/\D/g, '').length < 8) errors.phone = MESSAGES.phone
  if (form.street.trim().length < 3) errors.street = MESSAGES.street
  if (form.city.trim().length < 2) errors.city = MESSAGES.city
  if (!/^[a-z0-9]{4,8}$/i.test(form.postalCode.trim())) errors.postalCode = MESSAGES.postalCode
  return errors
}

export const isCheckoutFormComplete = (form: CheckoutForm, needsEmail: boolean): boolean =>
  Object.keys(validateCheckoutForm(form, needsEmail)).length === 0
