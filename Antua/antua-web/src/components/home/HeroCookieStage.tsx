import { lazy, Suspense, useCallback, useState } from 'react'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import { useAfterLoadIdle } from '../../hooks/useAfterLoadIdle'
import { usePageVisible } from '../../hooks/usePageVisible'
import { isLowEndDevice } from '../../lib/deviceTier'
import { WebGLErrorBoundary } from '../../three/cookie/WebGLErrorBoundary'
import type { CookieHandle } from '../../three/cookie/CookieRig'

// Three.js y R3F viajan en un chunk aparte: el texto del hero no espera al 3D.
const Cookie3D = lazy(() => import('../../three/cookie/Cookie3D'))

/** Captura de la escena real (qa/hero-poster.ts), con fondo transparente: sirve en claro y en oscuro. */
const POSTER = '/hero-cookie.webp'
const POSTER_SIZE = 960
/**
 * Alto del poster respecto del alto del contenedor (lo imprime qa/hero-poster.ts al generarlo).
 * La cámara 3D tiene un campo de visión vertical fijo: la galleta escala con el ALTO del contenedor.
 * Con esta proporción el poster queda del mismo tamaño y en el mismo lugar que la escena.
 */
const POSTER_HEIGHT_RATIO = 0.6578

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

/**
 * La galleta del hero.
 * 1. Se ve de inmediato el poster (una imagen fija de la misma escena, con width/height y
 *    fetchpriority alta), en la caja definitiva: no hay salto de layout.
 * 2. Con la página cargada, el navegador libre y el hero en pantalla, se baja Three.js y se monta la
 *    escena ENCIMA del poster. El poster se desvanece recién cuando la escena está lista.
 * 3. Sin WebGL acelerado (o si falla) o con prefers-reduced-motion, queda solo el poster.
 * El render se pausa con el hero fuera de pantalla o la pestaña oculta, y en equipos modestos usa
 * menos píxeles (dpr 1).
 */
export function HeroCookieStage({ active, reducedMotion, paused, onReady, modelUrl }: HeroCookieStageProps) {
  const webgl = useWebGLSupport()
  const idle = useAfterLoadIdle()
  const visible = usePageVisible()
  const [lowEnd] = useState(isLowEndDevice)
  const [sceneReady, setSceneReady] = useState(false)
  // Una vez montada, la escena queda (aunque el hero salga de pantalla): solo se pausa.
  const mount3D = webgl && !reducedMotion && idle && (active || sceneReady)

  const handleReady = useCallback(
    (handle: CookieHandle) => {
      setSceneReady(true)
      onReady(handle)
    },
    [onReady],
  )

  return (
    <div data-hero-stage className="relative size-full overflow-hidden">
      <img
        src={POSTER}
        alt=""
        width={POSTER_SIZE}
        height={POSTER_SIZE}
        fetchPriority="high"
        decoding="async"
        style={{ height: `${POSTER_HEIGHT_RATIO * 100}%` }}
        className={`absolute top-1/2 left-1/2 aspect-square w-auto max-w-none -translate-1/2 transition-opacity duration-500 ease-out motion-reduce:transition-none ${sceneReady ? 'opacity-0' : 'opacity-100'}`}
      />
      {mount3D && (
        <WebGLErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Cookie3D
              className="absolute inset-0"
              active={active && visible}
              animated
              floating={!paused}
              lowEnd={lowEnd}
              onReady={handleReady}
              modelUrl={modelUrl}
            />
          </Suspense>
        </WebGLErrorBoundary>
      )}
    </div>
  )
}
