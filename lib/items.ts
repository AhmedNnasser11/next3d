export type RawCatalogItem = {
  id: string
  name: string
  kind: "chair" | "door" | "window" | "table" | "plant" | "rug" | "storage" | "filing" | "desk" | "bed" | "sofa" | "media" | "lamp" | "poster"
  model?: string // Optional specific model path
}

export const catalogItems: RawCatalogItem[] = [
  // Doors and Windows
  { id: "door-closed", name: "Closed Door", kind: "door", model: "/assets/models/glb/door.glb" },
  { id: "door-open", name: "Open Door", kind: "door", model: "/assets/models/glb/door-open.glb" },
  { id: "window-simple", name: "Window", kind: "window", model: "/assets/models/glb/WS-WC.glb" },
  
  // Chairs
  { id: "chair-simple", name: "Chair", kind: "chair", model: "/assets/models/glb/PED-SP-BF.glb" },
  { id: "chair-red", name: "Red Chair", kind: "chair", model: "/assets/models/glb/special/chairModernCushion.glb" },
  { id: "chair-blue", name: "Blue Chair", kind: "chair", model: "/assets/models/glb/special/chairRounded.glb" },
  
  // Storage items
  { id: "dresser-dark", name: "Dresser - Dark Wood", kind: "storage", model: "/assets/models/glb/special/dresser-dark.glb" },
  { id: "dresser-white", name: "Dresser - White", kind: "storage", model: "/assets/models/glb/special/dresser-white.glb" },
  { id: "bedside-shale", name: "Bedside table - Shale", kind: "storage", model: "/assets/models/glb/special/bedside-shale.glb" },
  { id: "bedside-white", name: "Bedside table - White", kind: "storage", model: "/assets/models/glb/special/bedside-white.glb" },
  { id: "wardrobe-white", name: "Wardrobe - White", kind: "storage", model: "/assets/models/glb/special/wardrobe-white.glb" },
  { id: "bookcase", name: "Bookshelf", kind: "storage", model: "/assets/models/glb/special/bookcaseClosed.glb" },
  { id: "filing-cabinet", name: "Filing Cabinet", kind: "filing", model: "/assets/models/glb/FILING-4DR.glb" },
  { id: "trunk", name: "Wooden Trunk", kind: "storage", model: "/assets/models/glb/special/trunk.glb" },
  
  // Beds
  { id: "bed-full", name: "Full Bed", kind: "bed", model: "/assets/models/glb/special/bedDouble.glb" },
  
  // Media
  { id: "media-white", name: "Media Console - White", kind: "media", model: "/assets/models/glb/special/media-white.glb" },
  { id: "media-black", name: "Media Console - Black", kind: "media", model: "/assets/models/glb/special/media-black.glb" },
  
  // Sofas
  { id: "sectional-olive", name: "Sectional - Olive", kind: "sofa", model: "/assets/models/glb/special/sectional-olive.glb" },
  { id: "sofa-grey", name: "Sofa - Grey", kind: "sofa", model: "/assets/models/glb/special/sofa-grey.glb" },
  
  // Tables
  { id: "table-desk", name: "Desk", kind: "table", model: "/assets/models/glb/DESK-BF.glb" },
  { id: "floor-lamp", name: "Floor Lamp", kind: "lamp", model: "/assets/models/glb/special/floor-lamp.glb" },
  { id: "coffee-table", name: "Coffee Table - Wood", kind: "table", model: "/assets/models/glb/special/coffee-table.glb" },
  { id: "side-table", name: "Side Table", kind: "table", model: "/assets/models/glb/special/side-table.glb" },
  { id: "dining-table", name: "Dining Table", kind: "table", model: "/assets/models/glb/special/dining-table.glb" },
  
  // Decorative items
  { id: "plant-bin", name: "Plant", kind: "plant", model: "/assets/models/glb/bin1.glb" },
  { id: "blue-rug", name: "Blue Rug", kind: "rug", model: "/assets/models/glb/MTB-TBASE.glb" },
  { id: "nyc-poster", name: "NYC Poster", kind: "poster", model: "/assets/models/glb/special/nyc-poster.glb" },
  
  // Desk variations
  { id: "desk-corner-left", name: "Corner Desk (Left)", kind: "desk", model: "/assets/models/glb/DESK-WVL.glb" },
  { id: "desk-corner-right", name: "Corner Desk (Right)", kind: "desk", model: "/assets/models/glb/DESK-WVR.glb" },
  { id: "desk-return-left", name: "Return Desk (Left)", kind: "desk", model: "/assets/models/glb/RTN-WL.glb" },
  { id: "desk-return-right", name: "Return Desk (Right)", kind: "desk", model: "/assets/models/glb/RTN-WR.glb" },
]
