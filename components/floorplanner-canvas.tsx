/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePlannerStore } from "@/lib/store"

type Mode = "MOVE" | "DRAW" | "DELETE"
type DragMode = "CORNER" | "WALL" | null

const PX_PER_M = 50
const M_PER_PX = 1 / PX_PER_M
const WALL_HIT_TOLERANCE = 8 // pixels

type Pt = { x: number; z: number }

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function distanceToLineSegment(point: Pt, lineStart: Pt, lineEnd: Pt): number {
  const A = point.x - lineStart.x
  const B = point.z - lineStart.z
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.z - lineStart.z

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) return Math.hypot(A, B)

  let param = dot / lenSq
  param = Math.max(0, Math.min(1, param))

  const xx = lineStart.x + param * C
  const yy = lineStart.z + param * D

  return Math.hypot(point.x - xx, point.z - yy)
}

function snapToGrid(value: number, gridSize = 0.1): number {
  return Math.round(value / gridSize) * gridSize
}

/** Scale the canvas for device pixel ratio and draw in CSS pixels */
function resizeCanvasToDisplaySize(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const { clientWidth: w, clientHeight: h } = c
  const displayW = Math.max(1, Math.floor(w * dpr))
  const displayH = Math.max(1, Math.floor(h * dpr))
  let changed = false
  if (c.width !== displayW || c.height !== displayH) {
    c.width = displayW
    c.height = displayH
    changed = true
  }
  const ctx = c.getContext("2d")!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return changed
}

export function EnhancedFloorplannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>("MOVE")
  const pts = usePlannerStore((s) => s.fpPoints)
  const segs = usePlannerStore((s) => s.fpSegments)
  const addPoint = usePlannerStore((s) => s.fpAddPoint)
  const closeLoop = usePlannerStore((s) => s.fpCloseLoop)
  const clear = usePlannerStore((s) => s.fpClear)
  const movePoint = usePlannerStore((s) => s.fpMovePoint)
  const deletePoint = usePlannerStore((s) => s.fpDeletePoint)
  const buildFromFloorplan = usePlannerStore((s) => s.buildFromFloorplan)
  const setTab = usePlannerStore((s) => s.setTab)

  const [hover, setHover] = useState<Pt | null>(null)
  const [hoverWallIndex, setHoverWallIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragWallIndex, setDragWallIndex] = useState<number | null>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragStartPoints, setDragStartPoints] = useState<Pt[]>([])
  const [dragOffset, setDragOffset] = useState<Pt>({ x: 0, z: 0 })
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [sizeTick, setSizeTick] = useState(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true)
      if (e.key === "Escape") {
        // Cancel current drag and revert to pre-drag state
        if (dragMode && dragStartPoints.length > 0) {
          dragStartPoints.forEach((pt, i) => {
            if (i < pts.length) {
              movePoint(i, [pt.x, pt.z])
            }
          })
        }
        setDragMode(null)
        setDragIndex(null)
        setDragWallIndex(null)
        setDragStartPoints([])
        setMode("MOVE")
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [dragMode, dragStartPoints, pts.length, movePoint])

  // Toolbar UI
  const renderToolbar = () => {
    return (
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-md shadow-md">
        <Button
          size="sm"
          variant={mode === "MOVE" ? "default" : "outline"}
          onClick={() => setMode("MOVE")}
          className="flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 9l4-4 4 4" />
            <path d="M5 15l4 4 4-4" />
            <path d="M19 9l-4-4-4 4" />
            <path d="M19 15l-4 4-4-4" />
          </svg>
          Move
        </Button>
        <Button
          size="sm"
          variant={mode === "DRAW" ? "default" : "outline"}
          onClick={() => setMode("DRAW")}
          className="flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18v18H3z" />
          </svg>
          Draw
        </Button>
        <Button
          size="sm"
          variant={mode === "DELETE" ? "default" : "outline"}
          onClick={() => setMode("DELETE")}
          className="flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
          Delete
        </Button>
        <div className="h-px w-full bg-gray-200 my-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={clear}
          className="flex items-center gap-1 text-red-500 hover:text-red-600 bg-transparent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Clear
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            if (pts.length > 2) {
              closeLoop()
              buildFromFloorplan()
              setTab("design")
            }
          }}
          disabled={pts.length <= 2}
          className="flex items-center gap-1 mt-2"
        >
          Done
        </Button>
      </div>
    )
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")!

    resizeCanvasToDisplaySize(c)

    const W = c.clientWidth
    const H = c.clientHeight

    const toPx = (p: Pt) => ({
      x: W / 2 + p.x * PX_PER_M,
      y: H / 2 - p.z * PX_PER_M,
    })

    // Clear and background
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = "#eef2f7"
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += PX_PER_M) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += PX_PER_M) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = "#d1d5db"
    ctx.beginPath()
    ctx.moveTo(W / 2, 0)
    ctx.lineTo(W / 2, H)
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()

    ctx.lineWidth = 3
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      const a = toPx({ x: s.a[0], z: s.a[1] })
      const b = toPx({ x: s.b[0], z: s.b[1] })

      // Determine wall color based on state
      let strokeColor = "#0ea5e9"
      if (dragWallIndex === i && dragMode === "WALL") {
        strokeColor = "#ef4444" // Red for active drag
      } else if (hoverWallIndex === i && mode === "MOVE") {
        strokeColor = "#22c55e" // Green for hover
      }

      ctx.strokeStyle = strokeColor
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()

      const mid = { x: (s.a[0] + s.b[0]) / 2, z: (s.a[1] + s.b[1]) / 2 }
      const mpx = toPx(mid)
      const lenM = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
      const lenCm = Math.round(lenM * 100)

      ctx.fillStyle = dragWallIndex === i ? "#ef4444" : "#111827"
      ctx.font = dragWallIndex === i ? "bold 14px ui-sans-serif" : "12px ui-sans-serif"

      const labelOffset = dragWallIndex === i ? 12 : 6
      ctx.fillText(`${lenCm} cm`, mpx.x + labelOffset, mpx.y - labelOffset)
    }

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const px = toPx(p)
      ctx.beginPath()
      ctx.arc(px.x, px.y, dragIndex === i ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = dragIndex === i ? "#ef4444" : "#10b981"
      ctx.fill()
      ctx.strokeStyle = dragIndex === i ? "#dc2626" : "#065f46"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Drawing preview
    if (hover && mode === "DRAW" && pts.length > 0) {
      const last = pts[pts.length - 1]
      const a = toPx(last)
      const b = toPx(hover)
      ctx.strokeStyle = "#22c55e"
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [pts, segs, hover, mode, hoverWallIndex, dragIndex, dragWallIndex, dragMode, sizeTick])

  // Resize handling
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ro = new ResizeObserver(() => {
      resizeCanvasToDisplaySize(c)
      setSizeTick((t) => t + 1)
    })
    ro.observe(c)
    resizeCanvasToDisplaySize(c)
    setSizeTick((t) => t + 1)
    return () => ro.disconnect()
  }, [])

  // Client → world conversion
  const clientToWorld = (ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const xPx = ev.clientX - rect.left
    const yPx = ev.clientY - rect.top
    const x = (xPx - rect.width / 2) * M_PER_PX
    const z = (rect.height / 2 - yPx) * M_PER_PX
    return { x, z }
  }

  const findHitTarget = (worldPos: Pt) => {
    // First check for corner hits (higher priority)
    for (let i = 0; i < pts.length; i++) {
      const d = dist(worldPos, pts[i])
      if (d < 0.2) {
        // 20cm in world units
        return { type: "CORNER" as const, index: i }
      }
    }

    // Then check for wall hits
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      const lineStart = { x: s.a[0], z: s.a[1] }
      const lineEnd = { x: s.b[0], z: s.b[1] }
      const distToLine = distanceToLineSegment(worldPos, lineStart, lineEnd)

      if (distToLine < WALL_HIT_TOLERANCE * M_PER_PX) {
        return { type: "WALL" as const, index: i }
      }
    }

    return null
  }

  return (
    <div className="relative w-full h-[100svh] md:h-full select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none select-none"
        onContextMenu={(e) => {
          e.preventDefault()
          setMode("MOVE")
        }}
        onPointerMove={(e) => {
          const p = clientToWorld(e)
          setHover(p)

          if (dragMode === "CORNER" && dragIndex !== null) {
            const newPos = isShiftPressed ? { x: snapToGrid(p.x), z: snapToGrid(p.z) } : p
            movePoint(dragIndex, [newPos.x, newPos.z])
          } else if (dragMode === "WALL" && dragWallIndex !== null) {
            const seg = segs[dragWallIndex]
            if (!seg) return

            // Calculate wall normal and constrain movement
            const wallVec = { x: seg.b[0] - seg.a[0], z: seg.b[1] - seg.a[1] }
            const wallLen = Math.hypot(wallVec.x, wallVec.z)
            if (wallLen === 0) return

            const wallNormal = { x: -wallVec.z / wallLen, z: wallVec.x / wallLen }

            // Project mouse movement onto wall normal
            const dragDelta = { x: p.x - dragOffset.x, z: p.z - dragOffset.z }
            const normalProjection = dragDelta.x * wallNormal.x + dragDelta.z * wallNormal.z

            const constrainedDelta = {
              x: wallNormal.x * normalProjection,
              z: wallNormal.z * normalProjection,
            }

            // Apply grid snapping if Shift is held
            if (isShiftPressed) {
              constrainedDelta.x = snapToGrid(constrainedDelta.x)
              constrainedDelta.z = snapToGrid(constrainedDelta.z)
            }

            // Move both endpoints of the wall
            const aIndex = pts.findIndex((pt) => Math.abs(pt.x - seg.a[0]) < 1e-6 && Math.abs(pt.z - seg.a[1]) < 1e-6)
            const bIndex = pts.findIndex((pt) => Math.abs(pt.x - seg.b[0]) < 1e-6 && Math.abs(pt.z - seg.b[1]) < 1e-6)

            if (aIndex !== -1) {
              const newA = {
                x: dragStartPoints[aIndex].x + constrainedDelta.x,
                z: dragStartPoints[aIndex].z + constrainedDelta.z,
              }
              movePoint(aIndex, [newA.x, newA.z])
            }

            if (bIndex !== -1) {
              const newB = {
                x: dragStartPoints[bIndex].x + constrainedDelta.x,
                z: dragStartPoints[bIndex].z + constrainedDelta.z,
              }
              movePoint(bIndex, [newB.x, newB.z])
            }
          }

          if (mode === "MOVE" && !dragMode) {
            const hit = findHitTarget(p)
            setHoverWallIndex(hit?.type === "WALL" ? hit.index : null)
          }
        }}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {}
          const p = clientToWorld(e)

          if ((e as any).button === 2) {
            setMode("MOVE")
            return
          }

          if (mode === "DRAW") {
            if (pts.length >= 3 && Math.hypot(p.x - pts[0].x, p.z - pts[0].z) < 0.25) {
              closeLoop()
              return
            }
            addPoint([p.x, p.z])
            return
          }

          if (mode === "MOVE") {
            const hit = findHitTarget(p)

            if (hit?.type === "CORNER") {
              setDragMode("CORNER")
              setDragIndex(hit.index)
              setDragStartPoints([...pts])
            } else if (hit?.type === "WALL") {
              setDragMode("WALL")
              setDragWallIndex(hit.index)
              setDragOffset(p)
              setDragStartPoints([...pts])
            }
          }

          if (mode === "DELETE") {
            const hit = findHitTarget(p)
            if (hit?.type === "CORNER") {
              deletePoint(hit.index)
            }
          }
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {}
          setDragMode(null)
          setDragIndex(null)
          setDragWallIndex(null)
          setDragStartPoints([])
        }}
        onPointerCancel={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {}
          setDragMode(null)
          setDragIndex(null)
          setDragWallIndex(null)
          setDragStartPoints([])
        }}
      />

      {renderToolbar()}

      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-md shadow-md text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Mode:</span>
          <span>{mode}</span>
          {dragMode && <span className="text-blue-600">({dragMode})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Points:</span>
          <span>{pts.length}</span>
        </div>
        {isShiftPressed && <div className="text-blue-600 text-xs mt-1">Grid Snap: ON</div>}
        <div className="text-xs text-gray-500 mt-1">ESC: Cancel • Shift: Grid Snap</div>
      </div>
    </div>
  )
}
