/** Dirección guardada (addresses/entities/address.entity.ts). Solo para usuarios con sesión. */
export interface Address {
  id: number
  label: string | null
  street: string
  city: string
  postal_code: string
  country: string
  is_default: boolean
}

/** Body de POST /addresses y PATCH /addresses/:id (addresses/dto/address.dto.ts). */
export interface AddressPayload {
  label?: string
  street: string
  city: string
  postal_code: string
  country: string
  is_default?: boolean
}
