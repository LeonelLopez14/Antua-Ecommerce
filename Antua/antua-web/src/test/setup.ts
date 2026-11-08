import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom no implementa matchMedia (lo usan usePrefersReducedMotion y el tema).
// Se simula "reduced motion" para que GSAP haga solo fundidos cortos en los tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
