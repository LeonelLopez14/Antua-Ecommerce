import { expect, test, type Page } from '@playwright/test'

/**
 * WCAG 1.4.11 (contraste de componentes que no son texto): el borde de inputs, selects y del botón
 * secundario tiene que llegar a 3:1 contra el fondo que tiene detrás, en claro y en oscuro.
 * axe no lo mide. Se lee el color COMPUTADO en el navegador, no el token.
 */

/** Luminancia relativa y contraste de WCAG, con el color de borde compuesto sobre el fondo si tiene alfa. */
function contrastIn(page: Page, selector: string) {
  return page.evaluate((sel) => {
    // Cualquier color CSS (rgb, oklab, color-mix…) a RGBA: se pinta en un canvas de 1 px y se lee.
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const parse = (value: string): [number, number, number, number] => {
      if (!context) return [0, 0, 0, 0]
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = '#000'
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const background = (element: Element | null): [number, number, number] => {
      for (let el = element; el; el = el.parentElement) {
        const [r, g, b, a] = parse(getComputedStyle(el).backgroundColor)
        if (a > 0.99) return [r, g, b]
      }
      return [255, 255, 255]
    }
    const luminance = ([r, g, b]: [number, number, number]) => {
      const f = (c: number) => {
        const v = c / 255
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    return [...document.querySelectorAll(sel)]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => {
        const bg = background(el.parentElement)
        const [r, g, b, a] = parse(getComputedStyle(el).borderTopColor)
        const border: [number, number, number] = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
        const [hi, lo] = [luminance(border), luminance(bg)].sort((x, y) => y - x)
        return { el: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''), ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100 }
      })
  }, selector)
}

for (const scheme of ['light', 'dark'] as const) {
  test(`bordes de controles con 3:1 en modo ${scheme === 'light' ? 'claro' : 'oscuro'}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    const found: { el: string; ratio: number }[] = []

    // Tienda: select de orden y, a 375 px, el botón secundario "Filtros".
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/tienda')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    found.push(...(await contrastIn(page, 'select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), a.border-2, button.border-2')))

    // Formulario con FormField (input de email) y botón secundario, en escritorio.
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/olvide-mi-contrasena')
    await expect(page.getByLabel('Email')).toBeVisible()
    found.push(...(await contrastIn(page, 'input[type=email], button.border-2, a.border-2')))

    expect(found.length, 'controles medidos').toBeGreaterThan(2)
    const below = found.filter((item) => item.ratio < 3)
    expect(below, `Bordes por debajo de 3:1 (${scheme}): ${JSON.stringify(found)}`).toEqual([])
  })
}
