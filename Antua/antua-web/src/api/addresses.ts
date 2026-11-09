import { api } from './client'
import type { Address, AddressPayload } from '../types/address'

/** GET /addresses (JWT): la predeterminada primero. */
export async function fetchAddresses(signal?: AbortSignal): Promise<Address[]> {
  const { data } = await api.get<Address[]>('/addresses', { signal })
  return data
}

/** POST /addresses (JWT). La primera dirección queda como predeterminada. */
export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<Address>('/addresses', payload)
  return data
}

/** PATCH /addresses/:id (JWT). */
export async function updateAddress(id: number, payload: Partial<AddressPayload>): Promise<Address> {
  const { data } = await api.patch<Address>(`/addresses/${id}`, payload)
  return data
}

/** PATCH /addresses/:id/default (JWT): desmarca las demás. */
export async function setDefaultAddress(id: number): Promise<Address> {
  const { data } = await api.patch<Address>(`/addresses/${id}/default`)
  return data
}

/** DELETE /addresses/:id (JWT). */
export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/addresses/${id}`)
}
