import { expect, test } from '@playwright/test'

/**
 * Flujo principal como invitado:
 * Home → Tienda → Ficha → agregar → drawer → cupón → checkout → confirmación.
 * Usa los datos de prueba del backend (producto "Clásica con chips", cupón SEEDFIJO).
 */
test('un invitado compra con cupón y ve la confirmación', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Hechas para darte un gustito.' })).toBeVisible()

  // Home → Tienda (filtrada por Clásicas desde el CTA del hero)
  await page.getByRole('link', { name: 'Ver galletas' }).first().click()
  await expect(page).toHaveURL(/\/tienda\?categoria=clasicas/)

  // Tienda → Ficha
  await page.getByRole('link', { name: 'Clásica con chips' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Clásica con chips' })).toBeVisible()

  // Agregar → se abre el drawer del carrito
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  const drawer = page.getByRole('dialog', { name: /Tu carrito/ })
  await expect(drawer).toBeVisible()

  // Cupón válido: aparece en los totales
  await drawer.getByLabel('¿Tenés un cupón?').fill('SEEDFIJO')
  await drawer.getByRole('button', { name: 'Aplicar' }).click()
  await expect(drawer.getByRole('button', { name: 'Quitar cupón SEEDFIJO' })).toBeVisible()

  // Checkout
  await drawer.getByRole('link', { name: 'Ir a checkout' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Paso 1 de 4: Dirección' })).toBeVisible()

  await page.getByLabel('Email').fill(`e2e.${Date.now()}@antua.test`)
  await page.getByLabel('Nombre y apellido').fill('Prueba E2E')
  await page.getByLabel('Teléfono').fill('11 5555 4444')
  await page.getByLabel('Calle y número').fill('Av. Corrientes 1234')
  await page.getByLabel('Ciudad o localidad').fill('CABA')
  await page.getByLabel('Código postal').fill('1043')
  await page.getByRole('button', { name: 'Continuar al envío' }).click()

  await expect(page).toHaveURL(/paso=2/)
  await page.getByRole('link', { name: 'Continuar al pago' }).click()

  // El camino depende de si la API tiene pagos activos (por ejemplo, PAYMENTS_SIMULATED=true).
  const payments = await page.request.get('/api/payments/config')
  const { enabled } = (await payments.json()) as { enabled: boolean }

  if (enabled) {
    await expect(page.getByText('Pagás en Mercado Pago')).toBeVisible()
    await page.getByRole('button', { name: 'Pagar con Mercado Pago' }).click()
    // Retorno del proveedor simulado: el estado lo informa el servidor, no la URL.
    await expect(page).toHaveURL(/\/pago\/pendiente/)
    await expect(page.getByRole('heading', { level: 1, name: 'Estamos esperando la confirmación' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear cuenta y guardar el pedido' })).toBeVisible()
    return
  }

  await expect(page.getByText('El pago online llega pronto')).toBeVisible()
  await page.getByRole('link', { name: 'Revisar y confirmar' }).click()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  // Confirmación con número de pedido y el cupón aplicado en el resumen
  await expect(page.getByRole('heading', { level: 1, name: '¡Gracias por tu pedido!' })).toBeVisible()
  await expect(page.getByText(/^#\d+$/)).toBeVisible()
  await expect(page.getByText('SEEDFIJO').first()).toBeAttached()
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()
})
