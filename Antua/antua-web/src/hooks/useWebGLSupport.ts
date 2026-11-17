import { useState } from 'react'

let cached: boolean | null = null

/**
 * Detecta WebGL con aceleración por hardware una sola vez y libera el contexto de prueba.
 * `failIfMajorPerformanceCaveat` hace que el navegador no entregue un contexto si WebGL va a
 * correr por software (sin GPU: máquinas virtuales, equipos viejos, GPU bloqueada). Ahí la escena
 * 3D trabaría la página, así que se muestra la galleta SVG, igual que sin WebGL.
 */
function detectWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
    const gl = canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options)
    cached = gl !== null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}

export function useWebGLSupport(): boolean {
  const [supported] = useState(detectWebGL)
  return supported
}
