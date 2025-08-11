/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import type { PlacedItem as PlacedItemType } from "@/types"
import { usePlannerStore } from "@/lib/store"
import { GLTFModel } from "./gltf-model"
function useDragOnPlane(y = 0) {
  const { camera, raycaster, size } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), [y])
  const intersect = (event: any) => {
    const rect = event.target.getBoundingClientRect?.() ?? { left: 0, top: 0, width: size.width, height: size.height }
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const yN = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera({ x, y: yN }, camera)
    const pt = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, pt)
    return pt
  }
  return intersect
}

type SnapWall = { a: [number, number]; b: [number, number]; normal: [number, number] }

function snapToNearestWall(ptXZ: [number, number], walls: SnapWall[]) {
  let best: null | { p: [number, number]; wall: SnapWall; t: number; dist: number } = null
  for (const w of walls) {
    const ax = w.a[0],
      az = w.a[1]
    const bx = w.b[0],
      bz = w.b[1]
    const vx = bx - ax,
      vz = bz - az
    const wx = ptXZ[0] - ax,
      wz = ptXZ[1] - az
    const L2 = vx * vx + vz * vz || 1
    let t = (wx * vx + wz * vz) / L2
    t = Math.max(0, Math.min(1, t))
    const px = ax + t * vx
    const pz = az + t * vz
    const dx = ptXZ[0] - px
    const dz = ptXZ[1] - pz
    const dist = Math.hypot(dx, dz)
    if (!best || dist < best.dist) {
      best = { p: [px, pz], wall: w, t, dist }
    }
  }
  return best
}

// GLTFs per kind from the assets folder
const MODEL_MAP: Partial<Record<PlacedItemType["kind"], { url: string; rotationOffsetY?: number; scale?: number }>> = {
  chair: { url: "/assets/models/glb/PED-SP-BF.glb", rotationOffsetY: Math.PI / 2, scale: 1 },
  table: { url: "/assets/models/glb/DESK-BF.glb", rotationOffsetY: Math.PI / 2, scale: 1 },
  door: { url: "/assets/models/glb/door.glb", rotationOffsetY: Math.PI / 2, scale: 1 }, // Fixed door rotation
  window: { url: "/assets/models/glb/WS-WC.glb", rotationOffsetY: 0, scale: 1 },
  plant: { url: "/assets/models/glb/bin1.glb", rotationOffsetY: 0, scale: 1 },
  rug: { url: "/assets/models/glb/MTB-TBASE.glb", rotationOffsetY: 0, scale: 1 },
}

export function PlacedItem({ item }: { item: PlacedItemType }) {
  const groupRef = useRef<THREE.Group>(null!)
  const setSelected = usePlannerStore((s) => s.setSelected)
  const selectedId = usePlannerStore((s) => s.selectedId)
  const setItemTransform = usePlannerStore((s) => s.setItemTransform)
  const walls = usePlannerStore((s) => s.walls)
  const wallThickness = usePlannerStore((s) => s.wallThickness)
  const controls = usePlannerStore((s) => s._orbitControls)
  const [dragging, setDragging] = useState(false)
  const intersectPlane = useDragOnPlane(0)

  const isSelected = selectedId === item.id
  
  // Use specific model from item if available
  const modelConfig = item.model ? 
    { url: item.model, rotationOffsetY: 0, scale: 1 } : 
    MODEL_MAP[item.kind]

  // Fallback primitive dimensions if no GLTF
  const fallbackDims: [number, number, number] =
    item.kind === "door"
      ? [0.9, 2.0, 0.1]
      : item.kind === "window"
        ? [1.2, 1.0, 0.1]
      : item.kind === "table" || item.kind === "desk"
        ? [1.2, 0.75, 0.8]
      : item.kind === "chair"
        ? [0.5, 0.9, 0.5]
      : item.kind === "plant"
        ? [0.4, 1.2, 0.4]
      : item.kind === "rug"
        ? [1.8, 0.02, 1.2]
      : item.kind === "storage" || item.kind === "filing"
        ? [0.8, 1.8, 0.5]
        : [0.8, 0.8, 0.8]

  // Bounds from GLTF (if present)
  const [bounds, setBounds] = useState<{ box: THREE.Box3; size: THREE.Vector3; center: THREE.Vector3 } | null>(null)

  // Compute item depth along local Z (for wall offset), with fallback to primitive dims
  const itemDepth = useMemo(() => {
    if (bounds) return Math.max(0.02, bounds.size.z)
    return fallbackDims[2]
  }, [bounds, fallbackDims])

  // On mount/update mirror store transform to group
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(item.position[0], item.position[1], item.position[2])
    groupRef.current.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2])
    groupRef.current.scale.setScalar(item.scale ?? 1)
  }, [item.position, item.rotation, item.scale])

  // Keep non-wall items resting on the floor (auto-lift by -minY of bounds)
  useEffect(() => {
    if (!bounds) return
    if (item.kind === "door" || item.kind === "window") return
    const minY = bounds.box.min.y
    if (minY < 0) {
      const dy = -minY
      setItemTransform(item.id, { position: [item.position[0], dy, item.position[2]] })
    } else if (item.position[1] < 0) {
      setItemTransform(item.id, { position: [item.position[0], 0, item.position[2]] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds])

  return (
    <group
      ref={groupRef}
      position={item.position as any}
      rotation={item.rotation as any}
      scale={item.scale ?? 1}
      onPointerDown={(e) => {
        e.stopPropagation()
        setSelected(item.id)
        setDragging(true)
        if (controls) {
          controls.enabled = false
          controls.update()
        }
        try {
          ;(e.target as any).setPointerCapture?.((e as any).pointerId)
        } catch {}
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        setDragging(false)
        if (controls) {
          controls.enabled = selectedId == null
          controls.update()
        }
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        e.stopPropagation()
        const pt = intersectPlane(e.nativeEvent)
        if (!pt) return
        let newX = pt.x
        let newZ = pt.z

        if (item.kind === "door" || item.kind === "window") {
          const snap = snapToNearestWall([newX, newZ], walls as any)
          if (snap && snap.dist < 0.6) {
            const px = snap.p[0],
              pz = snap.p[1]
            const nx = snap.wall.normal[0],
              nz = snap.wall.normal[1]
            // Offset away from wall so model never cuts into it:
            // half wall thickness + half item depth + a small clearance
            const clearance = 0.01
            const offset = wallThickness / 2 + itemDepth / 2 + clearance

            // Determine side relative to outward normal from projected point
            const dx = newX - px
            const dz = newZ - pz
            const sideSign = Math.sign(dx * nx + dz * nz) || 1
            newX = px + nx * sideSign * offset
            newZ = pz + nz * sideSign * offset

            // Face outward; flip when crossing sides
            let normalAngle = Math.atan2(nz, nx)
            if (sideSign < 0) normalAngle += Math.PI

            const y = item.kind === "window" ? Math.max(1.1, item.position[1]) : 0
            setItemTransform(item.id, { position: [newX, y, newZ], rotation: [0, normalAngle, 0] })
            return
          }
          // Away from walls: keep their intended elevation
          const y = item.kind === "window" ? Math.max(1.1, item.position[1]) : 0
          setItemTransform(item.id, { position: [newX, y, newZ] })
          return
        }

        // Free-move items: keep on ground plane (y at or above 0, auto-lift handled separately)
        setItemTransform(item.id, { position: [newX, Math.max(0, item.position[1]), newZ] })
      }}
    >
      {/* Selection ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={isSelected}>
        <ringGeometry
          args={[
            Math.max(fallbackDims[0], fallbackDims[2]) * 0.7,
            Math.max(fallbackDims[0], fallbackDims[2]) * 0.75,
            48,
          ]}
        />
        <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
      </mesh>

      {/* Render GLTF if available for kind or from item.model, else fallback primitive */}
      {modelConfig ? (
        <group scale={modelConfig.scale ?? 1}>
          <GLTFModel
            url={modelConfig.url}
            rotationOffsetY={modelConfig.rotationOffsetY ?? 0}
            onBounds={setBounds}
          />
        </group>
      ) : (
        <>
          {/* Simple primitives as fallback visuals for each kind */}
          {item.kind === "table" && (
            <group>
              <mesh castShadow receiveShadow position={[0, fallbackDims[1] / 2, 0]}>
                <boxGeometry args={fallbackDims} />
                <meshStandardMaterial color="#a78bfa" roughness={0.8} />
              </mesh>
            </group>
          )}
          {item.kind === "plant" && (
            <group>
              <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.3, 16]} />
                <meshStandardMaterial color="#8b5e3c" roughness={0.9} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
                <coneGeometry args={[0.5, 1.2, 12]} />
                <meshStandardMaterial color="#22c55e" roughness={0.8} />
              </mesh>
            </group>
          )}
          {item.kind === "rug" && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
              <planeGeometry args={[fallbackDims[0], fallbackDims[2]]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.95} />
            </mesh>
          )}
          {(item.kind === "door" || item.kind === "window" || item.kind === "chair") && (
            <mesh castShadow receiveShadow position={[0, fallbackDims[1] / 2, 0]}>
              <boxGeometry args={fallbackDims} />
              <meshStandardMaterial
                color={item.kind === "chair" ? "#c2410c" : item.kind === "door" ? "#9ca3af" : "#60a5fa"}
                roughness={0.8}
              />
            </mesh>
          )}
        </>
      )}
    </group>
  )
}
