export type RawCatalogItem = {
  id: string;
  name: string;
  kind:
    | "chair"
    | "door"
    | "window"
    | "table"
    | "plant"
    | "rug"
    | "storage"
    | "filing"
    | "desk"
    | "bed"
    | "sofa"
    | "media"
    | "lamp";
  model?: string; // Optional specific model path
};

// Curated catalog mapped only to existing files in /public/assets/models/glb and /special
export const catalogItems: RawCatalogItem[] = [
  // Doors and Windows (existing)
  {
    id: "door-closed",
    name: "Closed Door",
    kind: "door",
    model: "/assets/models/glb/door.glb",
  },
  {
    id: "door-open",
    name: "Open Door",
    kind: "door",
    model: "/assets/models/glb/special/doorwayOpen.glb",
  },
  {
    id: "window-simple",
    name: "Window",
    kind: "window",
    model: "/assets/models/glb/WS-WC.glb",
  },

  // Chairs
  {
    id: "chair-simple",
    name: "Chair",
    kind: "chair",
    model: "/assets/models/glb/PED-SP-BF.glb",
  },
  {
    id: "chair-modern",
    name: "Chair (Modern Cushion)",
    kind: "chair",
    model: "/assets/models/glb/special/chairModernCushion.glb",
  },
  {
    id: "chair-rounded",
    name: "Chair (Rounded)",
    kind: "chair",
    model: "/assets/models/glb/special/chairRounded.glb",
  },

  // Storage
  {
    id: "bookcase-closed",
    name: "Bookshelf (Closed)",
    kind: "storage",
    model: "/assets/models/glb/special/bookcaseClosed.glb",
  },
  {
    id: "wardrobe-white",
    name: "Wardrobe",
    kind: "storage",
    model: "/assets/models/glb/WARD-1DOR-1CR.glb",
  },

  // Filing
  {
    id: "filing-cabinet",
    name: "Filing Cabinet",
    kind: "filing",
    model: "/assets/models/glb/FILING-4DR.glb",
  },

  // Beds
  {
    id: "bed-double",
    name: "Bed (Double)",
    kind: "bed",
    model: "/assets/models/glb/special/bedDouble.glb",
  },

  // Sofas
  {
    id: "sofa-lounge",
    name: "Sofa",
    kind: "sofa",
    model: "/assets/models/glb/special/loungeSofa.glb",
  },

  // Media
  {
    id: "media-cabinet",
    name: "Media Cabinet",
    kind: "media",
    model: "/assets/models/glb/special/cabinetTelevision.glb",
  },

  // Tables / Desks
  {
    id: "desk-straight",
    name: "Desk",
    kind: "table",
    model: "/assets/models/glb/DESK-BF.glb",
  },
  {
    id: "desk-corner-left",
    name: "Corner Desk (Left)",
    kind: "desk",
    model: "/assets/models/glb/DESK-WVL.glb",
  },
  {
    id: "desk-corner-right",
    name: "Corner Desk (Right)",
    kind: "desk",
    model: "/assets/models/glb/DESK-WVR.glb",
  },
  {
    id: "desk-return-left",
    name: "Return Desk (Left)",
    kind: "desk",
    model: "/assets/models/glb/RTN-WL.glb",
  },
  {
    id: "desk-return-right",
    name: "Return Desk (Right)",
    kind: "desk",
    model: "/assets/models/glb/RTN-WR.glb",
  },
  {
    id: "coffee-table",
    name: "Coffee Table",
    kind: "table",
    model: "/assets/models/glb/special/tableCoffee.glb",
  },
  {
    id: "side-table",
    name: "Side Table",
    kind: "table",
    model: "/assets/models/glb/special/sideTable.glb",
  },

  // Lamps
  {
    id: "floor-lamp-round",
    name: "Floor Lamp",
    kind: "lamp",
    model: "/assets/models/glb/special/lampRoundFloor.glb",
  },

  // Decorative
  {
    id: "plant-bin",
    name: "Plant",
    kind: "plant",
    model: "/assets/models/glb/bin1.glb",
  },
  {
    id: "rug-rect",
    name: "Rug",
    kind: "rug",
    model: "/assets/models/glb/MTB-TBASE.glb",
  },
];
