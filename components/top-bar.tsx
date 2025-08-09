"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePlannerStore } from "@/lib/store"
import { downloadText } from "@/lib/download"
import { Toggle } from "@/components/ui/toggle"

export function TopBar() {
  const serialize = usePlannerStore((s) => s.serialize)
  const loadFromJson = usePlannerStore((s) => s.loadFromJson)
  const newPlan = usePlannerStore((s) => s.reset)
  const floorColor = usePlannerStore((s) => s.floorColor)
  const setFloorColor = usePlannerStore((s) => s.setFloorColor)
  const floorTexOn = usePlannerStore((s) => s.floorTexOn)
  const setFloorTexOn = usePlannerStore((s) => s.setFloorTexOn)
  const buildFromFloorplan = usePlannerStore((s) => s.buildFromFloorplan)
  const setTab = usePlannerStore((s) => s.setTab)

  function onSave() {
    const data = serialize()
    downloadText("design.json", data)
  }

  async function onLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    loadFromJson(text)
    e.currentTarget.value = ""
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button variant="secondary" size="sm" onClick={newPlan}>
        New Plan
      </Button>
      <Button variant="secondary" size="sm" onClick={onSave}>
        Save Plan
      </Button>
      <label className="inline-flex items-center gap-2">
        <Input type="file" className="h-8 w-[160px]" onChange={onLoad} />
      </label>
      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Floor color</span>
        <input
          aria-label="Floor color"
          type="color"
          className="h-8 w-10 p-0 border rounded"
          value={floorColor}
          onChange={(e) => setFloorColor(e.target.value)}
        />
        <Toggle
          pressed={floorTexOn}
          onPressedChange={setFloorTexOn}
          className="h-8"
          aria-label="Toggle floor texture"
        >
          Texture
        </Toggle>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        size="sm"
        onClick={() => {
          buildFromFloorplan()
          setTab("design")
        }}
      >
        Done » Build 3D
      </Button>
    </div>
  )
}
