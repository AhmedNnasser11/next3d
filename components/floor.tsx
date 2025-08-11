"use client"

import * as THREE from "three"
import { useMemo } from "react"
import { usePlannerStore } from "@/lib/store"

// Small procedural checker texture to keep things asset-free
function makeFloorTexture() {
  const size = 256
  const cells = 8
  const cellSize = size / cells
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const isDark = (x + y) % 2 === 0
      ctx.fillStyle = isDark ? "#b8b4ad" : "#d9d5cf"
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  tex.anisotropy = 4
  return tex
}

// Geometric helpers for a small inward polygon offset (mitered) to keep floor inside walls at any angle
function polygonArea(poly: [number, number][]) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}
function normalize([x, y]: [number, number]) {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l] as [number, number]
}
// Return a slightly inset polygon; for CCW polygons we move inward to the left of each edge.
// For CW polygons we invert the sign so "inward" is still toward the interior.
function offsetPolygon(poly: [number, number][], distance: number): [number, number][] {
  if (poly.length < 3) return poly
  const isCCW = polygonArea(poly) > 0
  const sign = isCCW ? 1 : -1 // positive means "left" is interior for CCW

  const out: [number, number][] = []
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length]
    const curr = poly[i]
    const next = poly[(i + 1) % poly.length]

    const e1 = normalize([curr[0] - prev[0], curr[1] - prev[1]])
    const e2 = normalize([next[0] - curr[0], next[1] - curr[1]])

    // Left normals for each edge (treat z as y here)
    const n1: [number, number] = [-e1[1], e1[0]] // left of e1
    const n2: [number, number] = [-e2[1], e2[0]] // left of e2

    // Inward normals considering winding
    const in1: [number, number] = [n1[0] * sign, n1[1] * sign]
    const in2: [number, number] = [n2[0] * sign, n2[1] * sign]

    // Miter direction and length
    const miter = normalize([in1[0] + in2[0], in1[1] + in2[1]])
    // Avoid division by zero in very sharp angles
    const denom = miter[0] * in2[0] + miter[1] * in2[1]
    let miterLen = denom !== 0 ? distance / denom : distance

    // Clamp excessive miters (sharp angles)
    const MAX_MITER = Math.abs(distance) * 10
    if (miterLen > MAX_MITER) miterLen = MAX_MITER
    if (miterLen < -MAX_MITER) miterLen = -MAX_MITER

    out.push([curr[0] + miter[0] * miterLen, curr[1] + miter[1] * miterLen])
  }
  return out
}

export function FloorMesh() {
  const polygon = usePlannerStore((s) => s.floorPolygon)
  const floorColor = usePlannerStore((s) => s.floorColor)
  const floorTexOn = usePlannerStore((s) => s.floorTexOn)
  const wallThickness = usePlannerStore((s) => s.wallThickness)

  // Slightly inset the floor to ensure it visually sits inside the walls (eliminates gaps/overlaps at oblique angles)
  const innerPolygon = useMemo(() => {
    if (polygon.length < 3) return polygon
    // 2–5 mm inset, scaled to wall thickness but never too small
    const inset = Math.min(0.005, wallThickness * 0.25) // meters - positive value for inward offset
    try {
      return offsetPolygon(polygon, inset)
    } catch {
      return polygon // fallback to original if anything goes wrong
    }
  }, [polygon, wallThickness])

  const shape = useMemo(() => {
    if (innerPolygon.length < 3) return null
    const s = new THREE.Shape()
    const [p0, ...rest] = innerPolygon
    s.moveTo(p0[0], -p0[1])
    for (const p of rest) s.lineTo(p[0], -p[1])
    s.closePath()
    return s
  }, [innerPolygon])

  const texture = useMemo(() => (floorTexOn ? makeFloorTexture() : null), [floorTexOn])

  if (!shape) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={floorTexOn ? "#ffffff" : floorColor}
        map={texture ?? undefined}
        metalness={0.0}
        roughness={0.9}
        // Reduce seam artifacts where floor meets walls
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
}
