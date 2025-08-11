export type PlannerStateTab = "floorplan" | "design" | "shop"

export type FurnitureKind = "chair" | "door" | "window" | "table" | "plant" | "rug" | "storage" | "filing" | "desk"

export type CatalogItem = {
  id: string
  name: string
  kind: FurnitureKind
  model?: string
}

export type PlacedItem = {
  id: string
  name: string
  kind: FurnitureKind
  model?: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: number
}

export type TransformMode = "translate" | "rotate" | "scale"
