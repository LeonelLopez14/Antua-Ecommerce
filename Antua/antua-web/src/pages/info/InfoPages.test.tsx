import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import About from './About'
import Contact from './Contact'
import Faq from './Faq'
import Privacy from './Privacy'
import Terms from './Terms'

const renderPage = (Page: ComponentType) =>
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )

const description = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content

describe('páginas institucionales (docs/contenido-sitio.md)', () => {
  it.each([
    [About, 'Galletas hechas para darte un gustito', 'Conocé Antojarte'],
    [Faq, 'Preguntas frecuentes', 'Respuestas sobre pedidos'],
    [Contact, 'Contacto', 'Respondemos en 1 o 2 días hábiles'],
    [Terms, 'Términos y condiciones', 'Condiciones de uso'],
    [Privacy, 'Política de privacidad', 'Qué datos personales'],
  ] as const)('%o: título, meta description y sin marcas de provisorio', (Page, h1, desc) => {
    renderPage(Page)
    expect(screen.getByRole('heading', { level: 1, name: h1 })).toBeInTheDocument()
    expect(document.title).toBe(`${h1} · Antojarte`)
    expect(description()).toContain(desc)
    expect(document.body.textContent).not.toMatch(/provisorio|\.com\.ar/i)
  })

  it('Preguntas frecuentes: acordeón nativo agrupado por tema y el pago según el estado actual', () => {
    renderPage(Faq)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining(['Pedidos y envíos', 'Pagos', 'Ingredientes y alérgenos', 'Cuenta', 'Cambios y devoluciones']),
    )
    expect(document.querySelectorAll('details > summary').length).toBeGreaterThanOrEqual(14)
    expect(document.body.textContent).toContain('nos ponemos en contacto para coordinar el pago')
    expect(screen.getByRole('link', { name: 'Escribinos' })).toHaveAttribute('href', '/contacto')
  })

  it.each([Terms, Privacy])('%o: aviso de borrador, índice con anclas que existen y fecha real', (Page) => {
    renderPage(Page)
    expect(screen.getByRole('note')).toHaveTextContent('Borrador de práctica.')
    const toc = screen.getByRole('navigation', { name: 'Contenido' })
    const anchors = [...toc.querySelectorAll('a')]
    expect(anchors.length).toBeGreaterThan(5)
    for (const anchor of anchors) {
      const id = anchor.getAttribute('href')?.slice(1) ?? ''
      expect(document.getElementById(id)?.tagName).toBe('H2')
    }
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-11-16')
  })

  it('Contacto: solo datos de contacto, sin formulario, con el correo de ejemplo', () => {
    renderPage(Contact)
    expect(document.querySelector('form')).toBeNull()
    expect(screen.getByRole('link', { name: 'contacto@antojarte.example' })).toHaveAttribute('href', 'mailto:contacto@antojarte.example')
  })
})
