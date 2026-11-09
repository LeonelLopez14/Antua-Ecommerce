import type { Address, AddressPayload } from '../types/address'

export interface AddressForm {
  label: string
  street: string
  city: string
  postalCode: string
  country: string
  isDefault: boolean
}

export type AddressField = Exclude<keyof AddressForm, 'isDefault'>
export type AddressErrors = Partial<Record<AddressField, string>>

export const ADDRESS_FIELD_ORDER: AddressField[] = ['label', 'street', 'city', 'postalCode', 'country']

/** Largos máximos de `addresses` (address.entity.ts). */
export const ADDRESS_MAX_LENGTH: Record<AddressField, number> = {
  label: 50,
  street: 200,
  city: 200,
  postalCode: 20,
  country: 200,
}

export const emptyAddressForm = (isFirst: boolean): AddressForm => ({
  label: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'Argentina',
  isDefault: isFirst,
})

export const addressToForm = (address: Address): AddressForm => ({
  label: address.label ?? '',
  street: address.street,
  city: address.city,
  postalCode: address.postal_code,
  country: address.country,
  isDefault: address.is_default,
})

export function validateAddressForm(form: AddressForm): AddressErrors {
  const errors: AddressErrors = {}
  if (form.street.trim().length < 3) errors.street = 'Escribí la calle y el número.'
  if (form.city.trim().length < 2) errors.city = 'Escribí la ciudad o localidad.'
  if (!/^[a-z0-9]{4,8}$/i.test(form.postalCode.trim())) errors.postalCode = 'Escribí el código postal, por ejemplo 1405 o C1405ABC.'
  if (form.country.trim().length < 2) errors.country = 'Escribí el país.'
  return errors
}

export const addressFormToPayload = (form: AddressForm): AddressPayload => ({
  // label es opcional en el DTO: vacío no se manda.
  ...(form.label.trim() ? { label: form.label.trim() } : {}),
  street: form.street.trim(),
  city: form.city.trim(),
  postal_code: form.postalCode.trim(),
  country: form.country.trim(),
  is_default: form.isDefault,
})
