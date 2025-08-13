/*
  EnhancedFloorplannerCanvas
  - Stronger typings, fewer implicit anys
  - Robust hit-testing & dragging (wall drag maps to actual endpoint indices)
  - Crisper HiDPI rendering with DPR scaling
  - Better snapping (snap scalar along wall normal)
  - Keyboard UX: Shift = snap, Esc = cancel, Right-click = quick MOVE
  - Visual cues via cursor changes
  - Safer pointer-capture + cleanup
*/

"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { usePlannerStore } from "@/lib/store";

// === Types ===

type Mode = "MOVE" | "DRAW" | "DELETE";

type DragMode = "CORNER" | "WALL" | null;

type Pt = { x: number; z: number };

type Segment = { a: [number, number]; b: [number, number] };

// === Constants ===

const INITIAL_PX_PER_M = 50; // 1m => 50px
const WALL_HIT_TOLERANCE_PX = 8; // pick radius in pixels
const CORNER_HIT_TOLERANCE_M = 0.2; // 20 cm
const GRID_STEP_M = 0.1; // 10 cm

// === Math Utils ===

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.z - b.z);

function distanceToLineSegment(point: Pt, lineStart: Pt, lineEnd: Pt): number {
  const A = point.x - lineStart.x;
  const B = point.z - lineStart.z;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.z - lineStart.z;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  if (lenSq === 0) return Math.hypot(A, B);
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));
  const xx = lineStart.x + param * C;
  const yy = lineStart.z + param * D;
  return Math.hypot(point.x - xx, point.z - yy);
}

const snapToGrid = (v: number, step = GRID_STEP_M) =>
  Math.round(v / step) * step;

/** Scale the canvas for device pixel ratio and draw in CSS pixels */
function resizeCanvasToDisplaySize(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { clientWidth: w, clientHeight: h } = c;
  const displayW = Math.max(1, Math.floor(w * dpr));
  const displayH = Math.max(1, Math.floor(h * dpr));
  let changed = false;
  if (c.width !== displayW || c.height !== displayH) {
    c.width = displayW;
    c.height = displayH;
    changed = true;
  }
  const ctx = c.getContext("2d");
  if (!ctx) return changed;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return changed;
}

export function EnhancedFloorplannerCanvas() {
  // ===== Store bindings =====
  const pts = usePlannerStore((s) => s.fpPoints as Pt[]);
  const segs = usePlannerStore((s) => s.fpSegments as Segment[]);
  const addPoint = usePlannerStore(
    (s) => s.fpAddPoint as (p: [number, number]) => void
  );
  const closeLoop = usePlannerStore((s) => s.fpCloseLoop as () => void);
  const clear = usePlannerStore((s) => s.fpClear as () => void);
  const movePoint = usePlannerStore(
    (s) => s.fpMovePoint as (i: number, p: [number, number]) => void
  );
  const deletePoint = usePlannerStore(
    (s) => s.fpDeletePoint as (i: number) => void
  );
  const buildFromFloorplan = usePlannerStore(
    (s) => s.buildFromFloorplan as () => void
  );
  const setTab = usePlannerStore((s) => s.setTab as (t: string) => void);

  // ===== Local state/refs =====
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("MOVE");
  const [hover, setHover] = useState<Pt | null>(null);
  const [hoverWallIndex, setHoverWallIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragWallIndex, setDragWallIndex] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartPoints, setDragStartPoints] = useState<Pt[]>([]);
  const [dragOffset, setDragOffset] = useState<Pt>({ x: 0, z: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [sizeTick, setSizeTick] = useState(0);
  const [pxPerM, setPxPerM] = useState(INITIAL_PX_PER_M);

  // Track the endpoint indices corresponding to the currently dragged wall
  const dragWallPointIndicesRef = useRef<{ a: number; b: number } | null>(null);

  const mPerPx = useMemo(() => 1 / pxPerM, [pxPerM]);

  // ===== Keyboard handling =====
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
      if (e.key === "Escape") {
        // Cancel: revert to pre-drag state
        if (dragMode && dragStartPoints.length > 0) {
          dragStartPoints.forEach((pt, i) => {
            if (i < pts.length) movePoint(i, [pt.x, pt.z]);
          });
        }
        setDragMode(null);
        setDragIndex(null);
        setDragWallIndex(null);
        dragWallPointIndicesRef.current = null;
        setDragStartPoints([]);
        setMode("MOVE");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dragMode, dragStartPoints, pts.length, movePoint]);

  // ===== Drawing =====
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    resizeCanvasToDisplaySize(c);

    const W = c.clientWidth;
    const H = c.clientHeight;

    const toPx = (p: Pt) => ({
      x: W / 2 + p.x * pxPerM,
      y: H / 2 - p.z * pxPerM,
    });

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Grid (light)
    ctx.strokeStyle = "#eef2f7";
    ctx.lineWidth = 1;
    
    // Calculate grid offset to center it
    const offsetX = (W / 2) % pxPerM;
    const offsetY = (H / 2) % pxPerM;
    
    // Draw vertical grid lines
    for (let x = offsetX; x < W; x += pxPerM) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = offsetY; y < H; y += pxPerM) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    
    // Add axis labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px ui-sans-serif";
    ctx.fillText("Z", W / 2 + 5, 15);
    ctx.fillText("X", W - 15, H / 2 - 5);

    // Walls
    segs.forEach((s, i) => {
      const a = toPx({ x: s.a[0], z: s.a[1] });
      const b = toPx({ x: s.b[0], z: s.b[1] });
      
      // Draw wall shadow for depth effect
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.beginPath();
      ctx.moveTo(a.x + 2, a.y + 2);
      ctx.lineTo(b.x + 2, b.y + 2);
      ctx.stroke();
      
      // Draw the actual wall
      ctx.lineWidth = 3;
      let strokeColor = "#0ea5e9"; // blue default
      if (dragWallIndex === i && dragMode === "WALL")
        strokeColor = "#ef4444"; // active drag: red
      else if (hoverWallIndex === i && mode === "MOVE") strokeColor = "#22c55e"; // hover: green
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Length label (cm)
      const mid = { x: (s.a[0] + s.b[0]) / 2, z: (s.a[1] + s.b[1]) / 2 };
      const mpx = toPx(mid);
      const lenM = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const lenCm = Math.round(lenM * 100);
      ctx.fillStyle = dragWallIndex === i ? "#ef4444" : "#111827";
      ctx.font =
        dragWallIndex === i ? "bold 14px ui-sans-serif" : "12px ui-sans-serif";
      const labelOffset = dragWallIndex === i ? 12 : 6;
      ctx.fillText(`${lenCm} cm`, mpx.x + labelOffset, mpx.y - labelOffset);
    });

    // Points
    pts.forEach((p, i) => {
      const px = toPx(p);
      
      // Draw point shadow for depth effect
      ctx.beginPath();
      ctx.arc(px.x + 2, px.y + 2, dragIndex === i ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fill();
      
      // Draw the actual point
      ctx.beginPath();
      ctx.arc(px.x, px.y, dragIndex === i ? 8 : 6, 0, Math.PI * 2);
      
      // Change color based on state
      if (dragIndex === i) {
        // Active drag
        ctx.fillStyle = "#ef4444";
        ctx.strokeStyle = "#dc2626";
      } else if (mode === "DELETE" && dist(hover || { x: 0, z: 0 }, p) < CORNER_HIT_TOLERANCE_M) {
        // Hover in delete mode
        ctx.fillStyle = "#f87171";
        ctx.strokeStyle = "#b91c1c";
      } else {
        // Default
        ctx.fillStyle = "#10b981";
        ctx.strokeStyle = "#065f46";
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add point index for better reference
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px ui-sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), px.x, px.y);
    });

    // Draw-mode preview from last point to hover
    if (hover && mode === "DRAW" && pts.length > 0) {
      const last = pts[pts.length - 1];
      const a = toPx(last);
      const b = toPx(hover);
      
      // Regular DRAW mode preview
      ctx.strokeStyle = "#22c55e";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    pts,
    segs,
    hover,
    mode,
    hoverWallIndex,
    dragIndex,
    dragWallIndex,
    dragMode,
    sizeTick,
    pxPerM,
  ]);

  // Resize handling
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      resizeCanvasToDisplaySize(c);
      setSizeTick((t) => t + 1);
    });
    ro.observe(c);
    resizeCanvasToDisplaySize(c);
    setSizeTick((t) => t + 1);
    return () => ro.disconnect();
  }, []);

  // ===== Picking =====
  const findHitTarget = (worldPos: Pt) => {
    // Corners take priority
    for (let i = 0; i < pts.length; i++) {
      if (dist(worldPos, pts[i]) < CORNER_HIT_TOLERANCE_M)
        return { type: "CORNER" as const, index: i };
    }
    // Then walls
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const lineStart = { x: s.a[0], z: s.a[1] };
      const lineEnd = { x: s.b[0], z: s.b[1] };
      const d = distanceToLineSegment(worldPos, lineStart, lineEnd);
      if (d < WALL_HIT_TOLERANCE_PX * mPerPx)
        return { type: "WALL" as const, index: i };
    }
    return null;
  };

  // ===== Coordinate transforms =====
  const clientToWorld = (ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const xPx = ev.clientX - rect.left;
    const yPx = ev.clientY - rect.top;
    const x = (xPx - rect.width / 2) * mPerPx;
    const z = (rect.height / 2 - yPx) * mPerPx;
    return { x, z };
  };

  // Helper: map a seg's endpoints to current point indices (robust to non-consecutive storage)
  const mapSegmentToPointIndices = (s: Segment) => {
    const idxA = pts.reduce(
      (best, p, i) => {
        const d = Math.hypot(p.x - s.a[0], p.z - s.a[1]);
        return d < best.d ? { d, i } : best;
      },
      { d: Infinity, i: -1 }
    ).i;
    const idxB = pts.reduce(
      (best, p, i) => {
        const d = Math.hypot(p.x - s.b[0], p.z - s.b[1]);
        return d < best.d ? { d, i } : best;
      },
      { d: Infinity, i: -1 }
    ).i;
    return { a: idxA, b: idxB };
  };

  // Cursor feedback
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (dragMode) {
      c.style.cursor = "grabbing";
    } else if (mode === "DRAW") {
      c.style.cursor = "crosshair";
    } else if (hoverWallIndex !== null || dragIndex !== null) {
      c.style.cursor = "pointer";
    } else {
      c.style.cursor = "default";
    }
  }, [mode, dragMode, hoverWallIndex, dragIndex]);

  // ===== Render =====
  return (
    <div className="relative w-full h-[100svh] md:h-full select-none">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-md shadow-md text-sm">
        <div className="text-xs font-medium mb-1">Floorplan Editor</div>
        <div className="text-xs text-gray-500 mb-2">Create your room layout by adding points</div>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none select-none"
        tabIndex={0}
        role="application"
        aria-label="Floor planner canvas"
        onContextMenu={(e) => {
          e.preventDefault();
          setMode("MOVE");
        }}
        onPointerMove={(e) => {
          const p = clientToWorld(e);
          setHover(p);

          if (dragMode === "CORNER" && dragIndex !== null) {
            const newPos = isShiftPressed
              ? { x: snapToGrid(p.x), z: snapToGrid(p.z) }
              : p;
            
            // Calculate the delta movement from the original position
            const originalPoint = dragStartPoints[dragIndex];
            if (!originalPoint) return;
            
            const deltaX = newPos.x - originalPoint.x;
            const deltaZ = newPos.z - originalPoint.z;
            
            // Move all points together (connected movement)
            dragStartPoints.forEach((startPoint, idx) => {
              if (startPoint) {
                movePoint(idx, [startPoint.x + deltaX, startPoint.z + deltaZ]);
              }
            });
            return;
          }

          if (dragMode === "WALL" && dragWallIndex !== null) {
            const seg = segs[dragWallIndex];
            if (!seg) return;

            // Lazily compute indices of the endpoints for this seg
            if (!dragWallPointIndicesRef.current) {
              dragWallPointIndicesRef.current = mapSegmentToPointIndices(seg);
            }
            const { a: aIndex, b: bIndex } = dragWallPointIndicesRef.current;
            if (aIndex < 0 || bIndex < 0) return;

            // Compute normal to the wall
            const wallVec = { x: seg.b[0] - seg.a[0], z: seg.b[1] - seg.a[1] };
            const wallLen = Math.hypot(wallVec.x, wallVec.z);
            if (wallLen === 0) return;
            const wallNormal = {
              x: -wallVec.z / wallLen,
              z: wallVec.x / wallLen,
            };

            // Project mouse movement onto wall normal (scalar t)
            const dragDelta = { x: p.x - dragOffset.x, z: p.z - dragOffset.z };
            let t = dragDelta.x * wallNormal.x + dragDelta.z * wallNormal.z;
            if (isShiftPressed) t = snapToGrid(t); // snap scalar in meters
            const dx = wallNormal.x * t;
            const dz = wallNormal.z * t;

            // Apply delta relative to the recorded dragStartPoints
            const aStart = dragStartPoints[aIndex];
            const bStart = dragStartPoints[bIndex];
            if (!aStart || !bStart) return;
            movePoint(aIndex, [aStart.x + dx, aStart.z + dz]);
            movePoint(bIndex, [bStart.x + dx, bStart.z + dz]);
            return;
          }

          // Hover states while idling in MOVE
          if (mode === "MOVE" && !dragMode) {
            const hit = findHitTarget(p);
            setHoverWallIndex(hit?.type === "WALL" ? hit.index : null);
          }
        }}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}

          const p = clientToWorld(e);

          if (e.button === 2) {
            // right-click quick switch back to MOVE
            setMode("MOVE");
            return;
          }

          if (mode === "DRAW") {
            if (
              pts.length >= 3 &&
              Math.hypot(p.x - pts[0].x, p.z - pts[0].z) < 0.25
            ) {
              closeLoop();
              return;
            }
            addPoint([p.x, p.z]);
            return;
          }



          if (mode === "MOVE") {
            const hit = findHitTarget(p);
            if (hit?.type === "CORNER") {
              setDragMode("CORNER");
              setDragIndex(hit.index);
              // Store original positions of all points for connected movement
              setDragStartPoints([...pts]);
            } else if (hit?.type === "WALL") {
              setDragMode("WALL");
              setDragWallIndex(hit.index);
              setDragOffset(p);
              // Store original positions of all points for connected movement
              setDragStartPoints([...pts]);
              dragWallPointIndicesRef.current = null; // recalc on first move
            }
            return;
          }



          if (mode === "DELETE") {
            const hit = findHitTarget(p);
            if (hit?.type === "CORNER") deletePoint(hit.index);
            return;
          }
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          setDragMode(null);
          setDragIndex(null);
          setDragWallIndex(null);
          setDragStartPoints([]);
          dragWallPointIndicesRef.current = null;
        }}
        onPointerCancel={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          setDragMode(null);
          setDragIndex(null);
          setDragWallIndex(null);
          setDragStartPoints([]);
          dragWallPointIndicesRef.current = null;
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-3 rounded-md shadow-md border border-gray-200">
        <div className="text-sm font-medium mb-1 text-center">Tools</div>
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant={mode === "MOVE" ? "default" : "outline"}
            onClick={() => setMode("MOVE")}
            className="flex items-center justify-start gap-2 w-full"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 9l4-4 4 4" />
              <path d="M5 15l4 4 4-4" />
              <path d="M19 9l-4-4-4 4" />
              <path d="M19 15l-4 4-4-4" />
            </svg>
            <span>Move</span>
            {mode === "MOVE" && <span className="text-xs ml-auto opacity-75">(Active)</span>}
          </Button>
          <Button
            size="sm"
            variant={mode === "DRAW" ? "default" : "outline"}
            onClick={() => setMode("DRAW")}
            className="flex items-center justify-start gap-2 w-full"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3h18v18H3z" />
            </svg>
            <span>Draw</span>
            {mode === "DRAW" && <span className="text-xs ml-auto opacity-75">(Active)</span>}
          </Button>

          <Button
            size="sm"
            variant={mode === "DELETE" ? "default" : "outline"}
            onClick={() => setMode("DELETE")}
            className="flex items-center justify-start gap-2 w-full"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
            <span>Delete</span>
            {mode === "DELETE" && <span className="text-xs ml-auto opacity-75">(Active)</span>}
          </Button>
        </div>
        <div className="h-px w-full bg-gray-200 my-2" />
        <div className="text-sm font-medium mb-1 text-center">Actions</div>
        <div className="flex flex-col gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Zoom:</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPxPerM((v) => Math.max(10, Math.round(v / 1.2)))
                }
                aria-label="Zoom out"
                className="h-7 w-7 p-0"
              >
                －
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(pxPerM)}px/m</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPxPerM((v) => Math.min(200, Math.round(v * 1.2)))
                }
                aria-label="Zoom in"
                className="h-7 w-7 p-0"
              >
                ＋
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={clear}
            className="flex items-center justify-center gap-2 text-red-500 hover:text-red-600 bg-transparent"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Clear All
          </Button>
          
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              if (pts.length > 2) {
                closeLoop();
                buildFromFloorplan();
                setTab("design");
              }
            }}
            disabled={pts.length <= 2}
            className="flex items-center justify-center gap-2 mt-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Complete Floorplan
          </Button>
        </div>
      </div>

      {/* HUD */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-md shadow-md text-sm border border-gray-200">
        <div className="text-sm font-medium mb-2">Status</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-600">Mode:</span>
          <span className="px-2 py-0.5 rounded bg-gray-100">{mode}</span>
          {dragMode && <span className="text-blue-600 font-medium">({dragMode})</span>}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-600">Points:</span>
          <span className="px-2 py-0.5 rounded bg-gray-100">{pts.length}</span>
          {pts.length === 0 && (
            <span className="text-gray-500 text-xs">(No points yet)</span>
          )}
          {pts.length > 0 && pts.length < 3 && (
            <span className="text-orange-500 text-xs">(Need at least 3)</span>
          )}
          {pts.length >= 3 && (
            <span className="text-green-500 text-xs">(Ready to complete)</span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-600">Grid Snap:</span>
          <span className={`px-2 py-0.5 rounded ${isShiftPressed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
            {isShiftPressed ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
          <div className="flex flex-col gap-1">
            <div><span className="font-medium">ESC:</span> Cancel current action</div>
            <div><span className="font-medium">Shift:</span> Hold to enable grid snap</div>
            <div><span className="font-medium">Right-click:</span> Switch to Move mode</div>
            <div className="text-blue-600 mt-1">Move mode: All points move together when dragging any point</div>
          </div>
        </div>
      </div>
    </div>
  );
}
