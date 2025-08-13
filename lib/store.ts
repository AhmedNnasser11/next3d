/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { create } from "zustand"
import { nanoid } from "nanoid"
import type { PlacedItem, PlannerStateTab, TransformMode } from "@/types"
import * as THREE from "three"

type WallSeg = {
  id: string
  a: [number, number]
  b: [number, number]
  normal: [number, number]
}
type Pt = { x: number; z: number }

type State = {
  tab: PlannerStateTab
  placed: PlacedItem[]
  selectedId: string | null
  transformMode: TransformMode

  floorPolygon: [number, number][]
  walls: WallSeg[]
  wallHeight: number
  wallThickness: number
  floorColor: string
  floorTexOn: boolean
  roomCenter: [number, number, number]

  fpPoints: Pt[]
  fpSegments: { a: [number, number]; b: [number, number] }[]
  fpShapes: Pt[][]
  
  // New field to track individual shapes for 3D rendering
  individualShapes: Pt[][]

  _orbitControls: any | null
  _objects: Record<string, THREE.Object3D>
  _wallObjects: Record<string, THREE.Mesh>
  _wallNormals: Record<string, [number, number]>
}

type Actions = {
  setTab: (tab: PlannerStateTab) => void
  addItem: (input: { name: string; kind: PlacedItem["kind"]; model?: string }) => void
  removeItem: (id: string) => void
  reset: () => void
  serialize: () => string
  loadFromJson: (json: string) => void
  setSelected: (id: string | null) => void
  setTransformMode: (mode: TransformMode) => void
  rotateSelectedY: (deltaRadians: number) => void
  setItemTransform: (id: string, t: Partial<Pick<PlacedItem, "position" | "rotation" | "scale">>) => void
  setFloorColor: (color: string) => void
  setFloorTexOn: (on: boolean) => void
  fpAddPoint: (p: [number, number]) => void
  fpMovePoint: (index: number, p: [number, number]) => void
  fpDeletePoint: (index: number) => void
  fpCloseLoop: () => void
  fpClear: () => void
  fpCommitCurrentShape: () => void
  fpMovePointInShape: (shapeIndex: number, pointIndex: number, p: [number, number]) => void
  buildFromFloorplan: () => void
  buildFromIndividualShapes: () => void
  ensureItemsInside: () => void
  addDefaultDecor: () => void
  registerObject: (id: string, obj: THREE.Object3D) => void
  unregisterObject: (id: string) => void
  registerWallObject: (id: string, mesh: THREE.Mesh, normal: [number, number]) => void
  unregisterWallObject: (id: string) => void
  _setOrbitControls: (controls: any | null) => void
}

function polygonArea(poly: [number, number][]) {
  let area = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}
function polygonCentroid(poly: [number, number][]) {
  let x = 0,
    y = 0
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    const f = x1 * y2 - x2 * y1
    x += (x1 + x2) * f
    y += (y1 + y2) * f
    a += f
  }
  a *= 0.5
  if (Math.abs(a) < 1e-6) return [0, 0] as [number, number]
  return [x / (6 * a), y / (6 * a)] as [number, number]
}
function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  let inside = false
  const [x, y] = point
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1]
    const xj = polygon[j][0],
      yj = polygon[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
function computeWallsFromPolygon(polygon: [number, number][]): WallSeg[] {
  if (polygon.length < 3) return []
  const area = polygonArea(polygon)
  const isCCW = area > 0
  const walls: WallSeg[] = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize()
    // For CCW, interior is left; outward is right: (dy, -dx). For CW, invert.
    const outward: [number, number] = isCCW ? [dir.y, -dir.x] : [-dir.y, dir.x]
    walls.push({ id: nanoid(), a: [a[0], a[1]], b: [b[0], b[1]], normal: outward })
  }
  return walls
}

// Merge multiple shapes into one combined floorplan
function mergeShapesIntoFloorplan(shapes: Pt[][]): [number, number][] {
  if (shapes.length === 0) return []
  if (shapes.length === 1) return shapes[0].map((p) => [p.x, p.z])
  
  // For multiple shapes, create a bounding box that encompasses all shapes
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  
  shapes.forEach(shape => {
    shape.forEach(point => {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minZ = Math.min(minZ, point.z)
      maxZ = Math.max(maxZ, point.z)
    })
  })
  
  // Add some padding around the shapes
  const padding = 0.5 // 50cm padding
  minX -= padding
  maxX += padding
  minZ -= padding
  maxZ += padding
  
  // Create a rectangular floorplan that encompasses all shapes
  return [
    [minX, minZ],  // bottom-left
    [maxX, minZ],  // bottom-right
    [maxX, maxZ],  // top-right
    [minX, maxZ],  // top-left
  ]
}

const DEFAULT_POLY: [number, number][] = [
  [-3, -2],
  [3, -2],
  [3, 2],
  [-3, 2],
]

export const usePlannerStore = create<State & Actions>((set, get) => {
  const defaultWalls = computeWallsFromPolygon(DEFAULT_POLY)
  const [cx, cz] = polygonCentroid(DEFAULT_POLY)

  // Seed default decor so it's included with the default walls right away
  const initialDecor: PlacedItem[] = [
    { id: nanoid(), name: "Rug", kind: "rug", position: [cx, 0.01, cz], rotation: [0, 0, 0], scale: 1 },
    { id: nanoid(), name: "Table", kind: "table", position: [cx, 0, cz - 0.2], rotation: [0, 0, 0], scale: 1 },
    {
      id: nanoid(),
      name: "Chair",
      kind: "chair",
      position: [cx - 0.7, 0, cz - 0.2],
      rotation: [0, Math.PI / 2, 0],
      scale: 1,
    },
    { id: nanoid(), name: "Plant", kind: "plant", position: [cx + 1.2, 0, cz + 0.8], rotation: [0, 0, 0], scale: 1 },
  ]

  return {
    tab: "design",
    placed: initialDecor,
    selectedId: null,
    transformMode: "translate",

    floorPolygon: DEFAULT_POLY,
    walls: defaultWalls,
    wallHeight: 2.6,
    wallThickness: 0.12,
    floorColor: "#dddde3",
    floorTexOn: true,

    roomCenter: [cx, 0, cz],

    // Current in-progress shape (0..4 points) and its segments
    fpPoints: [],
    fpSegments: [],
    // Committed 4-corner shapes
    fpShapes: [DEFAULT_POLY.map(([x, z]) => ({ x, z }))],

    // New field to track individual shapes for 3D rendering
    individualShapes: [DEFAULT_POLY.map(([x, z]) => ({ x, z }))],

    _orbitControls: null,
    _objects: {},
    _wallObjects: {},
    _wallNormals: {},

    setTab: (tab) => set({ tab }),

    addItem: ({ name, kind, model }) =>
      set((s) => {
        if ((kind === "door" || kind === "window") && s.walls.length) {
          const w = s.walls[0]
          const mid: [number, number] = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2]
          const angle = Math.atan2(w.normal[1], w.normal[0])
          const y = kind === "window" ? 1.2 : 0
          // Sit just outside the inner wall face
          const newX = mid[0] + w.normal[0] * (s.wallThickness / 2 + 0.08)
          const newZ = mid[1] + w.normal[1] * (s.wallThickness / 2 + 0.08)
          return {
            placed: [
              ...s.placed,
              { id: nanoid(), name, kind, model, position: [newX, y, newZ], rotation: [0, angle, 0], scale: 1 },
            ],
            selectedId: null,
          }
        }
        return {
          placed: [
            ...s.placed,
            {
              id: nanoid(),
              name,
              kind,
              model,
              position: [s.roomCenter[0], 0, s.roomCenter[2]],
              rotation: [0, 0, 0],
              scale: 1,
            },
          ],
          selectedId: null,
        }
      }),

    removeItem: (id) =>
      set((s) => {
        const next = s.placed.filter((p) => p.id !== id)
        const nextSelected = s.selectedId === id ? null : s.selectedId
        const { [id]: _, ...rest } = s._objects
        return { placed: next, selectedId: nextSelected, _objects: rest }
      }),

    reset: () =>
      set({
        placed: initialDecor,
        selectedId: null,
        floorPolygon: DEFAULT_POLY,
        walls: computeWallsFromPolygon(DEFAULT_POLY),
        roomCenter: [cx, 0, cz],
        fpPoints: [],
        fpSegments: [],
        fpShapes: [DEFAULT_POLY.map(([x, z]) => ({ x, z }))],
        individualShapes: [DEFAULT_POLY.map(([x, z]) => ({ x, z }))],
      }),

    serialize: () => {
      const state = get()
      return JSON.stringify(
        {
          tab: state.tab,
          placed: state.placed,
          floorPolygon: state.floorPolygon,
          walls: state.walls,
          wallHeight: state.wallHeight,
          wallThickness: state.wallThickness,
          floorColor: state.floorColor,
          floorTexOn: state.floorTexOn,
        },
        null,
        2,
      )
    },

    loadFromJson: (json: string) => {
      try {
        const obj = JSON.parse(json)
        set({
          placed: Array.isArray(obj.placed) ? obj.placed : initialDecor,
          floorPolygon: Array.isArray(obj.floorPolygon) ? obj.floorPolygon : DEFAULT_POLY,
          walls:
            Array.isArray(obj.walls) && obj.walls.length
              ? obj.walls
              : computeWallsFromPolygon(obj.floorPolygon ?? DEFAULT_POLY),
          wallHeight: typeof obj.wallHeight === "number" ? obj.wallHeight : 2.6,
          wallThickness: typeof obj.wallThickness === "number" ? obj.wallThickness : 0.12,
          floorColor: typeof obj.floorColor === "string" ? obj.floorColor : "#dddde3",
          floorTexOn: typeof obj.floorTexOn === "boolean" ? obj.floorTexOn : true,
        })
        const poly = get().floorPolygon
        const [cx2, cz2] = poly.length ? polygonCentroid(poly) : [0, 0]
        set({ roomCenter: [cx2, 0, cz2] })
      } catch (e) {
        console.error("Invalid JSON:", e)
      }
    },

    setSelected: (id) => set({ selectedId: id }),
    setTransformMode: (mode) => set({ transformMode: mode }),
    rotateSelectedY: (delta) => {
      const { selectedId, placed } = get()
      if (!selectedId) return
      set({
        placed: placed.map((p) =>
          p.id === selectedId ? { ...p, rotation: [p.rotation[0], p.rotation[1] + delta, p.rotation[2]] } : p,
        ),
      })
    },
    setItemTransform: (id, t) =>
      set((s) => ({
        placed: s.placed.map((p) =>
          p.id === id
            ? {
                ...p,
                position: (t.position ?? p.position) as [number, number, number],
                rotation: (t.rotation ?? p.rotation) as [number, number, number],
                scale: t.scale ?? p.scale,
              }
            : p,
        ),
      })),

    setFloorColor: (color) => set({ floorColor: color }),
    setFloorTexOn: (on) => set({ floorTexOn: on }),

    fpAddPoint: ([x, z]) =>
      set((s) => {
        if (s.fpPoints.length >= 4) return {}
        const pts = [...s.fpPoints, { x, z }]
        let segs = s.fpSegments
        if (pts.length >= 2) {
          const a = pts[pts.length - 2]
          const b = pts[pts.length - 1]
          segs = [...segs, { a: [a.x, a.z], b: [b.x, b.z] }]
        }
        // Auto-commit when reaching 4 points
        if (pts.length === 4) {
          return { fpPoints: [], fpSegments: [], fpShapes: [...s.fpShapes, pts] }
        }
        return { fpPoints: pts, fpSegments: segs }
      }),
    fpMovePoint: (index, [x, z]) =>
      set((s) => {
        const pts = s.fpPoints.slice()
        pts[index] = { x, z }
        const segs =
          pts.length < 2
            ? []
            : pts.slice(0, -1).map((p, i) => ({
                a: [p.x, p.z] as [number, number],
                b: [pts[i + 1].x, pts[i + 1].z] as [number, number],
              }))
        return { fpPoints: pts, fpSegments: segs }
      }),
    fpDeletePoint: (index) =>
      set((s) => {
        const pts = s.fpPoints.filter((_, i) => i !== index)
        const segs =
          pts.length < 2
            ? []
            : pts.slice(0, -1).map((p, i) => ({
                a: [p.x, p.z] as [number, number],
                b: [pts[i + 1].x, pts[i + 1].z] as [number, number],
              }))
        return { fpPoints: pts, fpSegments: segs }
      }),
    fpCloseLoop: () =>
      set((s) => {
        if (s.fpPoints.length !== 4) return {}
        const pts = s.fpPoints.slice()
        return { fpPoints: [], fpSegments: [], fpShapes: [...s.fpShapes, pts] }
      }),
    fpClear: () => set({ fpPoints: [], fpSegments: [], fpShapes: [], individualShapes: [] }),
    fpCommitCurrentShape: () =>
      set((s) => {
        if (s.fpPoints.length !== 4) return {}
        const pts = s.fpPoints.slice()
        return { fpPoints: [], fpSegments: [], fpShapes: [...s.fpShapes, pts] }
      }),
    fpMovePointInShape: (shapeIndex, pointIndex, [x, z]) =>
      set((s) => {
        if (shapeIndex < 0 || shapeIndex >= s.fpShapes.length) return {}
        const shapes = s.fpShapes.map((sh, si) =>
          si === shapeIndex ? sh.map((p, pi) => (pi === pointIndex ? { x, z } : p)) : sh,
        )
        return { fpShapes: shapes }
      }),

    buildFromFloorplan: () => {
      const { fpShapes, fpPoints } = get()
      let polygon: [number, number][] = []
      
      // If we have committed shapes, merge them all into one floorplan
      if (fpShapes.length > 0) {
        polygon = mergeShapesIntoFloorplan(fpShapes)
      } else if (fpPoints.length === 4) {
        // If no committed shapes but we have a current 4-point shape, use that
        polygon = fpPoints.map((p) => [p.x, p.z])
      } else {
        return
      }
      
      const walls = computeWallsFromPolygon(polygon)
      const [cx2, cz2] = polygonCentroid(polygon)
      set({ floorPolygon: polygon, walls, roomCenter: [cx2, 0, cz2] })
      get().ensureItemsInside()
      if (get().placed.length === 0) {
        get().addDefaultDecor()
      }
    },

    buildFromIndividualShapes: () => {
      const { fpShapes } = get()
      
      if (fpShapes.length === 0) return
      
      set({ individualShapes: fpShapes })
      
      const polygons: [number, number][][] = fpShapes.map((shape) => shape.map((p) => [p.x, p.z] as [number, number]))
      const merged = mergeShapesIntoFloorplan(fpShapes)
      const allWalls = polygons.flatMap((poly) => computeWallsFromPolygon(poly))
      const [cx2, cz2] = polygonCentroid(merged)
      set({ floorPolygon: merged, walls: allWalls, roomCenter: [cx2, 0, cz2] })
      get().ensureItemsInside()
      if (get().placed.length === 0) {
        get().addDefaultDecor()
      }
    },

    ensureItemsInside: () => {
      const poly = get().floorPolygon
      if (!poly.length) return
      const [cx2, cz2] = polygonCentroid(poly)
      set((s) => ({
        placed: s.placed.map((p) => {
          const pos2: [number, number] = [p.position[0], p.position[2]]
          if (!pointInPolygon(pos2, poly)) {
            return { ...p, position: [cx2, p.position[1], cz2] }
          }
          return p
        }),
      }))
    },

    addDefaultDecor: () => {
      const [cx2, , cz2] = get().roomCenter
      const adds: PlacedItem[] = [
        { id: nanoid(), name: "Rug", kind: "rug", position: [cx2, 0.01, cz2], rotation: [0, 0, 0], scale: 1 },
        { id: nanoid(), name: "Table", kind: "table", position: [cx2, 0, cz2 - 0.2], rotation: [0, 0, 0], scale: 1 },
        {
          id: nanoid(),
          name: "Chair",
          kind: "chair",
          position: [cx2 - 0.7, 0, cz2 - 0.2],
          rotation: [0, Math.PI / 2, 0],
          scale: 1,
        },
        {
          id: nanoid(),
          name: "Plant",
          kind: "plant",
          position: [cx2 + 1.2, 0, cz2 + 0.8],
          rotation: [0, 0, 0],
          scale: 1,
        },
      ]
      set((s) => ({ placed: [...s.placed, ...adds] }))
    },

    registerObject: (id, obj) => set((s) => ({ _objects: { ...s._objects, [id]: obj } })),
    unregisterObject: (id) =>
      set((s) => {
        const { [id]: _, ...rest } = s._objects
        return { _objects: rest }
      }),
    registerWallObject: (id, mesh, normal) =>
      set((s) => ({
        _wallObjects: { ...s._wallObjects, [id]: mesh },
        _wallNormals: { ...s._wallNormals, [id]: normal },
      })),
    unregisterWallObject: (id) =>
      set((s) => {
        const { [id]: _, ...rest } = s._wallObjects
        const { [id]: __, ...restN } = s._wallNormals
        return { _wallObjects: rest, _wallNormals: restN }
      }),
    _setOrbitControls: (controls) => set({ _orbitControls: controls }),
  }
})
