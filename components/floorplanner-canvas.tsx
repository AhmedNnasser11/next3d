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

  const [hover, setHover] = useState<Pt | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

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

      <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant={mode === "MOVE" ? "default" : "secondary"} size="sm" onClick={() => setMode("MOVE")}>
            Move Points
          </Button>
          <Button variant={mode === "DRAW" ? "default" : "secondary"} size="sm" onClick={() => setMode("DRAW")}>
            Draw Walls
          </Button>
          <Button variant={mode === "DELETE" ? "default" : "secondary"} size="sm" onClick={() => setMode("DELETE")}>
            Delete Points
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Lengths appear in cm</Badge>
          <Button size="sm" variant="outline" onClick={() => clear()}>
            Clear
          </Button>
          <Button size="sm" onClick={() => buildFromFloorplan()}>
            Done » Build 3D
          </Button>
        </div>
      </div>
    </div>
  )
}
