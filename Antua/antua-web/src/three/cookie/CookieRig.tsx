import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { gsap, useGSAP } from '../../lib/gsap'
import type { CookieConfig } from './cookieConfig'

/** Grupos que el hero anima con GSAP (sin estado de React por frame). */
export interface CookieHandle {
  /** Escala y posición según la fase del hero (galleta sola / carrusel). */
  stage: Group
  /** Rotación ligada al scroll, alrededor del eje propio de la galleta (la cara con chips siempre queda a la vista). */
  turn: Group
}

interface CookieRigProps {
  config: CookieConfig
  /** Flotación activa. false con reduced motion o con el hero fuera de pantalla. */
  floating: boolean
  onReady?: (handle: CookieHandle) => void
  children: ReactNode
}

/** Jerarquía: stage › float › tilt › turn › modelo. Cada nivel lo controla una sola animación. */
export function CookieRig({ config, floating, onReady, children }: CookieRigProps) {
  const stageRef = useRef<Group>(null)
  const floatRef = useRef<Group>(null)
  const turnRef = useRef<Group>(null)

  useLayoutEffect(() => {
    if (stageRef.current && turnRef.current) {
      onReady?.({ stage: stageRef.current, turn: turnRef.current })
    }
  }, [onReady])

  useGSAP(
    () => {
      const float = floatRef.current
      if (!float || !floating) return
      const { amplitude, duration, sway } = config.float
      gsap.fromTo(
        float.position,
        { y: -amplitude },
        { y: amplitude, duration, ease: 'sine.inOut', yoyo: true, repeat: -1 },
      )
      gsap.fromTo(
        float.rotation,
        { z: -sway },
        { z: sway, duration: duration * 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 },
      )
    },
    { dependencies: [floating, config] },
  )

  return (
    <group ref={stageRef}>
      <group ref={floatRef}>
        <group rotation={[config.tilt, 0, 0]}>
          <group ref={turnRef}>{children}</group>
        </group>
      </group>
    </group>
  )
}
