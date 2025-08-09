"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei"
import { Suspense, useEffect } from "react"
import { usePlannerStore } from "@/lib/store"
import { TransformToolbar } from "@/components/transform-toolbar"
import { FloorMesh } from "./floor"
import { Walls } from "./walls"
import { PlacedItem } from "./placed-item"

function AutoHideFrontWall() {
  const { camera } = useThree()
  const wallRefs = usePlannerStore((s) => s._wallObjects)
  const wallData = usePlannerStore((s) => s.walls)
  const roomCenter = usePlannerStore((s) => s.roomCenter)

  useFrame(() => {
    if (!wallData.length) return
    // Unhide all
    for (const w of wallData) {
      const ref = wallRefs[w.id]
      if (ref) ref.visible = true
    }

    // Ray to center in XZ
    const ox = camera.position.x
    const oz = camera.position.z
    const dx0 = roomCenter[0] - ox
    const dz0 = roomCenter[2] - oz
    const dLen = Math.hypot(dx0, dz0) || 1
    const dx = dx0 / dLen
    const dz = dz0 / dLen

    let bestT = Number.POSITIVE_INFINITY
    let bestId: string | null = null

    for (const w of wallData) {
      const ax = w.a[0],
        az = w.a[1]
      const bx = w.b[0],
        bz = w.b[1]
      const sx = bx - ax
      const sz = bz - az

      const det = dx * -sz - dz * -sx
      if (Math.abs(det) < 1e-6) continue

      const rhsx = ax - ox
      const rhsz = az - oz
      const t = (rhsx * -sz - rhsz * -sx) / det
      const u = (dx * rhsz - dz * rhsx) / det

      if (t > 0 && u >= 0 && u <= 1) {
        if (t < bestT) {
          bestT = t
          bestId = w.id
        }
      }
    }

    if (bestId) {
      const ref = wallRefs[bestId]
      if (ref) ref.visible = false
    }
  })

  return null
}

export function RoomCanvas() {
  const items = usePlannerStore((s) => s.placed)
  const setControls = usePlannerStore((s) => s._setOrbitControls)
  const controls = usePlannerStore((s) => s._orbitControls)
  const selectedId = usePlannerStore((s) => s.selectedId)
  const setSelected = usePlannerStore((s) => s.setSelected)

  useEffect(() => {
    if (!controls) return
    controls.enabled = selectedId == null
    controls.update()
  }, [controls, selectedId])

  return (
    <div className="relative w-full h-full">
      <Canvas className="w-full h-full bg-white" shadows onPointerMissed={() => setSelected(null)}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[5, 3, 7]} fov={50} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[8, 12, 6]}
            intensity={0.9}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <Environment preset="apartment" />

          <Grid
            args={[50, 50]}
            cellSize={0.5}
            sectionSize={2}
            cellColor="#e5e7eb"
            sectionColor="#9ca3af"
            position={[0, -0.02, 0]} // push grid down to avoid z-fight with floor/wall seam
          />

          <OrbitControls
            ref={(ref) => setControls(ref || null)}
            enableDamping
            dampingFactor={0.08}
            minDistance={1}
            maxDistance={100}
            target={[0, 0, 0]}
          />

          <FloorMesh />
          <Walls />
          <AutoHideFrontWall />

          {items.map((it) => (
            <PlacedItem key={it.id} item={it} />
          ))}
        </Suspense>
      </Canvas>

      <TransformToolbar />
    </div>
  )
}
