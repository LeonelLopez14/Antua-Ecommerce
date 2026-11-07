import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { IcosahedronGeometry, MeshStandardMaterial, type InstancedMesh } from 'three'
import { createCookieGeometry } from './createCookieGeometry'
import type { CookieConfig } from './cookieConfig'

interface ProceduralCookieProps {
  config: CookieConfig
}

export function ProceduralCookie({ config }: ProceduralCookieProps) {
  const chipsRef = useRef<InstancedMesh>(null)

  const { dough, chipMatrices } = useMemo(() => createCookieGeometry(config), [config])
  const chipGeometry = useMemo(() => new IcosahedronGeometry(config.chipSize, 0), [config.chipSize])
  const doughMaterial = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
    [],
  )
  const chipMaterial = useMemo(
    () => new MeshStandardMaterial({ color: config.chipColor, roughness: 0.45, metalness: 0, flatShading: true }),
    [config.chipColor],
  )

  useLayoutEffect(() => {
    const chips = chipsRef.current
    if (!chips) return
    chipMatrices.forEach((m, i) => chips.setMatrixAt(i, m))
    chips.count = chipMatrices.length
    chips.instanceMatrix.needsUpdate = true
    chips.computeBoundingSphere()
  }, [chipMatrices])

  // Recursos creados a mano: se liberan explícitamente al desmontar o al cambiar la config.
  useEffect(() => () => dough.dispose(), [dough])
  useEffect(() => () => chipGeometry.dispose(), [chipGeometry])
  useEffect(() => () => doughMaterial.dispose(), [doughMaterial])
  useEffect(() => () => chipMaterial.dispose(), [chipMaterial])

  return (
    <group>
      <mesh geometry={dough} material={doughMaterial} />
      <instancedMesh ref={chipsRef} args={[chipGeometry, chipMaterial, config.chipCount]} />
    </group>
  )
}
