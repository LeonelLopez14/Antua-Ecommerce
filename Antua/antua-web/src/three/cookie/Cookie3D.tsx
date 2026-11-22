import { lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { cookieConfig, type CookieConfig } from './cookieConfig'
import { CookieRig, type CookieHandle } from './CookieRig'
import { ProceduralCookie } from './ProceduralCookie'

// drei y el loader de GLTF solo se bajan si hay un .glb: la galleta por defecto es procedural.
const GltfCookie = lazy(() => import('./GltfCookie').then((m) => ({ default: m.GltfCookie })))

export interface Cookie3DProps {
  /** .glb hecho en Blender. Si falta, se genera la galleta procedural. */
  modelUrl?: string
  /** false pausa el render (hero fuera de pantalla). */
  active?: boolean
  /** false = galleta estática (prefers-reduced-motion). */
  animated?: boolean
  /** Flotación automática. false = pausada por el usuario (el giro con el scroll sigue). */
  floating?: boolean
  /** Equipo modesto (lib/deviceTier.ts): densidad de píxeles 1×. */
  lowEnd?: boolean
  config?: CookieConfig
  onReady?: (handle: CookieHandle) => void
  className?: string
}

/**
 * Galleta 3D del hero. Solo se usa en la Home (DESIGN.md: 3D solo en el hero).
 * Export por defecto para cargarla con React.lazy.
 */
export default function Cookie3D({
  modelUrl,
  active = true,
  animated = true,
  floating = true,
  lowEnd = false,
  config = cookieConfig,
  onReady,
  className,
}: Cookie3DProps) {
  const { camera, lights } = config
  const frameloop = !active ? 'never' : animated ? 'always' : 'demand'

  return (
    <div aria-hidden="true" className={className}>
      <Canvas
        // Hasta 1,5×: en pantallas densas, 2× casi duplica el trabajo por cuadro sin una mejora visible.
        // En equipos modestos, 1× (la mitad de píxeles o menos que 1,5×).
        dpr={lowEnd ? 1 : [1, 1.5]}
        frameloop={frameloop}
        camera={{ fov: camera.fov, position: camera.position }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight color={lights.ambientColor} intensity={lights.ambientIntensity} />
        <directionalLight color={lights.keyColor} intensity={lights.keyIntensity} position={lights.keyPosition} />
        <directionalLight color={lights.fillColor} intensity={lights.fillIntensity} position={lights.fillPosition} />
        <CookieRig config={config} floating={animated && floating && active} onReady={onReady}>
          <Suspense fallback={null}>
            {modelUrl ? <GltfCookie url={modelUrl} /> : <ProceduralCookie config={config} />}
          </Suspense>
        </CookieRig>
      </Canvas>
    </div>
  )
}
