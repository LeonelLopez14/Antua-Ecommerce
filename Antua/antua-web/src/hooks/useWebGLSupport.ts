import { useState } from 'react'

let cached: boolean | null = null

/** Detecta WebGL una sola vez y libera el contexto de prueba. */
function detectWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
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
