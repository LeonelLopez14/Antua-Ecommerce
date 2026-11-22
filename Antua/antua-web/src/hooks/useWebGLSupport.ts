import { useState } from 'react'

let cached: boolean | null = null

/** Renderers de WebGL por software: cada cuadro pasa por la CPU y traba la página. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

/** Solo para qa/hero-poster.ts (captura la escena en un Chromium sin GPU). Los visitantes no lo tienen. */
function forced(): boolean {
  try {
    return localStorage.getItem('antua.force3d') === '1'
  } catch {
    return false
  }
}

/**
 * Detecta WebGL con aceleración por hardware una sola vez y libera el contexto de prueba.
 * - `failIfMajorPerformanceCaveat` hace que muchos navegadores no entreguen un contexto si WebGL
 *   va a correr por software (sin GPU: máquinas virtuales, equipos viejos, GPU bloqueada).
 * - No todos lo respetan (Chrome con SwiftShader entrega el contexto igual), así que además se mira
 *   el nombre del renderer. Por software la escena trabaría la página: se muestra el poster.
 */
function detectWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
    const gl = canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options)
    let accelerated = gl !== null
    if (gl && !forced()) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
      if (typeof renderer === 'string' && SOFTWARE_RENDERER.test(renderer)) accelerated = false
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    cached = accelerated
  } catch {
    cached = false
  }
  return cached
}

export function useWebGLSupport(): boolean {
  const [supported] = useState(detectWebGL)
  return supported
}
