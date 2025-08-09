export type RawCatalogItem = {
  id: string
  name: string
  kind: "chair" | "door" | "window" | "table" | "plant" | "rug"
}

export const catalogItems: RawCatalogItem[] = [
  { id: "door-simple", name: "Door", kind: "door" },
  { id: "window-simple", name: "Window", kind: "window" },
  { id: "chair-gltf", name: "Chair (GLTF demo)", kind: "chair" },
  { id: "table-simple", name: "Table", kind: "table" },
  { id: "plant-simple", name: "Plant", kind: "plant" },
  { id: "rug-simple", name: "Rug", kind: "rug" },
]
