"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePlannerStore } from "@/lib/store"

type Mode = "MOVE" | "DRAW" | "DELETE"

const PX_PER_M = 50
const M_PER_PX = 1 / PX_PER_M

type Pt = { x: number; z: number }

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function FloorplannerCanvas() {
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Add toolbar UI for floorplan editing modes
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
            <path d="M5 9l4-4 4 4"/>
            <path d="M5 15l4 4 4-4"/>
            <path d="M19 9l-4-4-4 4"/>
            <path d="M19 15l-4 4-4-4"/>
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
            <path d="M3 3h18v18H3z"/>
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
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
          Delete
        </Button>
        <div className="h-px w-full bg-gray-200 my-1"></div>
        <Button
          size="sm"
          variant="outline"
          onClick={clear}
          className="flex items-center gap-1 text-red-500 hover:text-red-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
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
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)

      // grid
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.strokeStyle = "#eef2f7"
      ctx.lineWidth = 1
      for (let x = 0; x < c.width; x += PX_PER_M) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke()
      }
      for (let y = 0; y < c.height; y += PX_PER_M) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke()
      }

      // axes
      ctx.strokeStyle = "#d1d5db"
      ctx.beginPath()
      ctx.moveTo(c.width / 2, 0); ctx.lineTo(c.width / 2, c.height)
      ctx.moveTo(0, c.height / 2); ctx.lineTo(c.width, c.height / 2)
      ctx.stroke()

      const toPx = (p: Pt) => ({
        x: c.width / 2 + p.x * PX_PER_M,
        y: c.height / 2 - p.z * PX_PER_M,
      })

      // segments with cm labels
      ctx.lineWidth = 3
      ctx.strokeStyle = "#0ea5e9"
      for (const s of segs) {
        const a = toPx({ x: s.a[0], z: s.a[1] })
        const b = toPx({ x: s.b[0], z: s.b[1] })
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()

        const mid = { x: (s.a[0] + s.b[0]) / 2, z: (s.a[1] + s.b[1]) / 2 }
        const mpx = toPx(mid)
        const lenM = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
        const lenCm = Math.round(lenM * 100)
        ctx.fillStyle = "#111827"
        ctx.font = "12px ui-sans-serif, system-ui"
        ctx.fillText(`${lenCm} cm`, mpx.x + 6, mpx.y - 6)
      }

      // points
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const px = toPx(p)
        ctx.beginPath()
        ctx.arc(px.x, px.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = "#10b981"
        ctx.fill()
        ctx.strokeStyle = "#065f46"
        ctx.stroke()
      }

      // drawing preview
      if (hover && mode === "DRAW" && pts.length > 0) {
        const last = pts[pts.length - 1]
        const a = toPx(last)
        const b = toPx(hover)
        ctx.strokeStyle = "#22c55e"
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    draw()
  }, [pts, segs, hover, mode])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    function resize() {
      c.width = c.clientWidth
      c.height = c.clientHeight
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // ESC and right-click to stop drawing/deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode("MOVE")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const clientToWorld = (ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const xPx = ev.clientX - rect.left
    const yPx = ev.clientY - rect.top
    const x = (xPx - ev.currentTarget.width / 2) * M_PER_PX
    const z = (ev.currentTarget.height / 2 - yPx) * M_PER_PX
    return { x, z }
  }

  return (
    <div className="relative h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onContextMenu={(e) => {
          e.preventDefault()
          setMode("MOVE")
        }}
        onPointerMove={(e) => {
          const p = clientToWorld(e)
          setHover(p)
          if (dragIndex != null && mode === "MOVE") {
            movePoint(dragIndex, [p.x, p.z])
          }
        }}
        onPointerDown={(e) => {
          const p = clientToWorld(e)
          // Right-click should exit drawing/move
          if ((e as any).button === 2) {
            setMode("MOVE")
            return
          }
          if (mode === "DRAW") {
            if (pts.length >= 3 && Math.hypot(p.x - pts[0].x, p.z - pts[0].z) < 0.25) {
              // close loop
              closeLoop()
              return
            }
            addPoint([p.x, p.z])
            return
          }
          if (mode === "MOVE") {
            let best = -1
            let bestD = 0.2
            for (let i = 0; i < pts.length; i++) {
              const d = dist(p, pts[i])
              if (d < bestD) {
                best = i
                bestD = d
              }
            }
            if (best >= 0) setDragIndex(best)
          }
          if (mode === "DELETE") {
            let best = -1
            let bestD = 0.2
            for (let i = 0; i < pts.length; i++) {
              const d = dist(p, pts[i])
              if (d < bestD) {
                best = i
                bestD = d
              }
            }
            if (best >= 0) deletePoint(best)
          }
        }}
        onPointerUp={() => setDragIndex(null)}
      />
      
      {renderToolbar()}
      
      {/* Status indicator */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-md shadow-md text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Mode:</span>
          <span>{mode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Points:</span>
          <span>{pts.length}</span>
        </div>
      </div>
    </div>
  )
}
