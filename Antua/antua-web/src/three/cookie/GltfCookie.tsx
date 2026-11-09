import { useEffect, useMemo } from 'react'
import { Center, useGLTF } from '@react-three/drei'
import { Mesh, type Material } from 'three'

interface GltfCookieProps {
  url: string
}

/**
 * Modelo exportado desde Blender (.glb).
 * Se espera con su centro en el origen, radio ≈ 1 y la cara superior mirando a +Y,
 * igual que la galleta procedural, para que la inclinación y la animación coincidan.
 *
 * useDraco = false: drei descargaría el decodificador Draco desde un CDN externo.
 * Si exportás con compresión Draco, copiá el decodificador a /public/draco/ y pasá '/draco/'.
 */
export function GltfCookie({ url }: GltfCookieProps) {
  const { scene } = useGLTF(url, false)
  const model = useMemo(() => scene.clone(true), [scene])

  useEffect(
    () => () => {
      model.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        obj.geometry.dispose()
        const materials: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((m) => m.dispose())
      })
      useGLTF.clear(url)
    },
    [model, url],
  )

  return (
    <Center>
      <primitive object={model} />
    </Center>
  )
}
