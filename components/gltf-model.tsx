/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useState } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"

type Props = {
  url: string
  rotationOffsetY?: number
  onBounds?: (bounds: { box: THREE.Box3; size: THREE.Vector3; center: THREE.Vector3 }) => void
}

/**
 * GLTFModel
 * - Loads a GLTF/GLB at url
 * - Calls onBounds with computed bounding box in local space
 * - Applies optional rotationOffsetY to match your model's forward direction with +Z
 */
export function GLTFModel({ url, rotationOffsetY = 0, onBounds }: Props) {
  const { scene } = useGLTF(url)
  const [isLoading, setIsLoading] = useState(true)

  const clone = useMemo(() => {
    if (!scene) return null
    const s = scene.clone(true)
    // ensure all meshes cast/receive shadows
    s.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => ((mat as any).shadowSide = THREE.FrontSide))
        } else if (m.material) {
          ;(m.material as any).shadowSide = THREE.FrontSide
        }
      }
    })
    setIsLoading(false)
    return s
  }, [scene])

  useEffect(() => {
    if (!clone) return
    // compute local bounds
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    onBounds?.({ box, size, center })
  }, [clone, onBounds])

  return (
    <group rotation-y={rotationOffsetY}>
      {isLoading && (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#000" wireframe={true} />
        </mesh>
      )}
      {clone && <primitive object={clone} />}
    </group>
  )
}

// Preload models to avoid jank
useGLTF.preload("/assets/models/glb/PED-SP-BF.glb")
useGLTF.preload("/assets/models/glb/DESK-BF.glb")
useGLTF.preload("/assets/models/glb/door.glb")
useGLTF.preload("/assets/models/glb/WS-WC.glb")
useGLTF.preload("/assets/models/glb/bin1.glb")
useGLTF.preload("/assets/models/glb/MTB-TBASE.glb")
