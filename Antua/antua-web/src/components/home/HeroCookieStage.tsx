import { lazy, Suspense } from 'react'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { CookieFallback } from '../../three/cookie/CookieFallback'
import { WebGLErrorBoundary } from '../../three/cookie/WebGLErrorBoundary'
import type { CookieHandle } from '../../three/cookie/CookieRig'

// Three.js y R3F viajan en un chunk aparte: el texto del hero no espera al 3D.
const Cookie3D = lazy(() => import('../../three/cookie/Cookie3D'))

interface HeroCookieStageProps {
  /** Hero visible: si es false, se pausa el render. */
  active: boolean
  reducedMotion: boolean
  /** El usuario pausó la flotación (WCAG 2.2.2: movimiento de más de 5 s con pausa). */
  paused: boolean
  onReady: (handle: CookieHandle) => void
  /** .glb opcional hecho en Blender. */
  modelUrl?: string
}

export function HeroCookieStage({ active, reducedMotion, paused, onReady, modelUrl }: HeroCookieStageProps) {
  const webgl = useWebGLSupport()
  const fallback = <CookieFallback className="flex size-full items-center justify-center p-8" />

  if (!webgl) return fallback

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Cookie3D
          className="size-full"
          active={active}
          animated={!reducedMotion}
          floating={!paused}
          onReady={onReady}
          modelUrl={modelUrl}
        />
      </Suspense>
    </WebGLErrorBoundary>
  )
}
