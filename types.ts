export type PlannerStateTab = "floorplan" | "design" | "shop"

export type CatalogItem = {
  id: string
  name: string
  kind: "chair" | "door" | "window" | "table" | "plant" | "rug"
}

export type PlacedItem = {
  id: string
  name: string
  kind: "chair" | "door" | "window" | "table" | "plant" | "rug"
  model?: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: number
}

export type TransformMode = "translate" | "rotate" | "scale"
