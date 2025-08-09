"use client"

import { Button } from "@/components/ui/button"
import { usePlannerStore } from "@/lib/store"
import { Move, RotateCw, RotateCcw, Scaling, Trash2, MousePointerSquareDashed } from 'lucide-react'
import { useEffect } from "react"

export function TransformToolbar() {
  const selectedId = usePlannerStore((s) => s.selectedId)
  const setTransformMode = usePlannerStore((s) => s.setTransformMode)
  const transformMode = usePlannerStore((s) => s.transformMode)
  const rotateSelectedY = usePlannerStore((s) => s.rotateSelectedY)
  const removeItem = usePlannerStore((s) => s.removeItem)
  const setSelected = usePlannerStore((s) => s.setSelected)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "w":
          setTransformMode("translate")
          break
        case "e":
          setTransformMode("rotate")
          break
        case "r":
          setTransformMode("scale")
          break
        case "q":
          rotateSelectedY(-Math.PI / 12)
          break
        case "a":
          rotateSelectedY(Math.PI / 12)
          break
        case "delete":
        case "backspace":
          if (selectedId) removeItem(selectedId)
          break
        case "escape":
          setSelected(null)
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId, setTransformMode, rotateSelectedY, removeItem, setSelected])

  return (
    <div className="absolute left-4 bottom-4 flex flex-wrap items-center gap-2">
      <div className="flex gap-2">
        <Button
          variant={transformMode === "translate" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTransformMode("translate")}
          aria-pressed={transformMode === "translate"}
        >
          <Move className="h-4 w-4 mr-1" />
          Move (W)
        </Button>
        <Button
          variant={transformMode === "rotate" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTransformMode("rotate")}
          aria-pressed={transformMode === "rotate"}
          disabled
          title="Rotate via Q/A or item handle on wall"
        >
          <Scaling className="h-4 w-4 mr-1" />
          Scale (R)
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={!selectedId} onClick={() => rotateSelectedY(-Math.PI / 12)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Left 15°
        </Button>
        <Button variant="secondary" size="sm" disabled={!selectedId} onClick={() => rotateSelectedY(Math.PI / 12)}>
          <RotateCw className="h-4 w-4 mr-1" />
          Right 15°
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="destructive" size="sm" disabled={!selectedId} onClick={() => selectedId && removeItem(selectedId)}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete (Del)
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
          <MousePointerSquareDashed className="h-4 w-4 mr-1" />
          Deselect (Esc)
        </Button>
      </div>
    </div>
  )
}
