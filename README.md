# next3d – interactive room planner (Next.js + R3F)

An interactive 2D/3D room planner. Draw a floorplan in 2D, then design in 3D by placing doors, windows, furniture, and decor. Built with Next.js App Router, react-three-fiber, drei, three.js, Zustand, and Tailwind.

Updated: 2025-08-12

## Tech stack

- Runtime: Next.js 15 (App Router, Turbopack), React 19, TypeScript
- 3D: three, @react-three/fiber, @react-three/drei
- State: Zustand
- UI: Tailwind v4, Radix UI (shadcn-style components)

## Run locally

1) Install deps: `npm i`
2) Start dev server: `npm run dev`
3) App runs at http://localhost:3000

## High-level architecture

- App shell: `app/page.tsx` toggles between two modes stored in the planner store (Zustand):
	- Floorplan (2D): `components/floorplanner-canvas.tsx`
	- Design (3D): `components/room-canvas.tsx`
- Sidebar + top bar: modes switching, save/load, build 3D, and floor settings.
- Global state: `lib/store.ts` is the single source of truth for:
	- tab, placed items, selection, transform mode
	- floor polygon, computed walls (with outward normals), room center
	- floor styling (color/texture), wall height/thickness
	- references to live 3D objects (for transforms)
- Types: `types.ts` (PlannerStateTab, FurnitureKind, PlacedItem, etc.)
- Catalog: `lib/items.ts` (curated list of items that map to GLB files under public/assets)

## Key files and responsibilities

- `lib/store.ts`
	- Geometry helpers: polygon area/centroid, point-in-polygon, walls-from-polygon with outward normals.
	- Actions: add/remove items, selection, rotate/transform, floor settings, floorplan editing (points/segments), build 3D from 2D, serialization/load.
	- Keeps refs to Object3D meshes for walls and placed items (enables external transform gizmo).

- `components/floorplanner-canvas.tsx`
	- 2D HTML canvas for drawing/editing the room outline.
	- Modes: Move/Draw/Delete (+ Shift to grid snap). Live measurements per wall.
	- On Done/Build: closes the loop and calls `buildFromFloorplan()` to compute `floorPolygon`, `walls`, `roomCenter`.

- `components/room-canvas.tsx`
	- 3D scene with PerspectiveCamera, Environment, OrbitControls, Grid.
	- Renders Floor (`components/floor.tsx`), Walls (`components/walls.tsx`), and each `PlacedItem`.
	- Auto-hide the front wall (ray from camera to room center) for a better interior view.
	- TransformControls gizmo is attached to the currently selected item and synchronized with the store.

- `components/placed-item.tsx`
	- Loads an item’s GLTF via `GLTFModel`, applies shadow flags, computes bounds (auto floor resting), and supports drag-to-move.
	- Doors/Windows snap to nearest wall (project point onto segment) and orient to wall normal; windows lifted to reasonable height.
	- Registers the Group’s Object3D in the store for `TransformControls`.

- `components/floor.tsx`
	- Creates a THREE.Shape from the floor polygon, with a small inward offset to avoid z-fighting with walls.
	- Uses a lightweight procedural texture (or solid color) and polygonOffset to reduce seams.

- `components/walls.tsx`
	- Builds wall meshes from wall segments, offsetting by half thickness outward using each segment’s normal.
	- Registers each wall mesh and its normal in the store (used for snapping/auto-hide).

- `components/gltf-model.tsx`
	- GLTF loader with per-mesh shadow settings. Emits bounds via `onBounds`.
	- Preloads commonly used models.

- `lib/items.ts`
	- Curated catalog of items (doors, windows, chairs, desks, storage, rugs, lamps, etc.) mapped to real GLB files.

## Data and coordinate conventions

- Units: meters. Floorplan space is XZ (Y up).
- Floor polygon: array of [x, z] in meters; orientation (winding) determines outward wall normals.
- Walls: each segment has endpoints a, b and an outward normal [nx, nz]. Thickness/height are applied at render time.
- Item transform: position [x, y, z], rotation [rx, ry, rz] in radians, uniform scale.

## 2D → 3D flow

1) User draws points (2D canvas) → `fpPoints`/`fpSegments` in the store.
2) On close/done, `buildFromFloorplan()` computes `floorPolygon`, `walls`, and `roomCenter`.
3) 3D scene consumes `floorPolygon` and `walls` to render `FloorMesh` and `Walls`.
4) Items are preserved and clamped inside the polygon if necessary.

## Assets

- All models live under `public/assets/models/glb` (and `glb/special`).
- The catalog only references files that exist in the repository.
- `GLTFModel` preloads commonly used assets to reduce hitching.

## Recent maintenance (2025-08-12)

Implemented fixes and best-practice refactors to stabilize experience:

1) Catalog paths corrected (lib/items.ts)
	 - Replaced references to non-existent models with existing GLB files under `public/assets/models/glb` and `/special`.
2) Transform gizmo integration (room-canvas.tsx, placed-item.tsx)
	 - Added `TransformControls` hooked to the selected item’s Object3D with real-time updates to the store.
	 - Placed items register/unregister their Object3D with the store.
3) GLTF loading cleanup (gltf-model.tsx)
	 - Avoid setState in `useMemo`. Use `useEffect` to track loading; ensure meshes cast/receive shadows.
	 - Preload only files that actually exist.
4) Floorplanner wall-drag robustness (floorplanner-canvas.tsx)
	 - Move wall endpoints by index mapping instead of fragile float equality.
5) Type safety and lint fixes
	 - Expanded `FurnitureKind` to include bed/sofa/media/lamp; typed Orbit controls helpers.
	 - Removed `any` casts, unused imports, and fixed JSX unescaped quotes.
6) Walls rendering
	 - Removed `any` on position/rotation; use global wall thickness prop; registered wall mesh refs with normals.

All modified files compile and lint cleanly; dev server verified on http://localhost:3000.

## How to extend

Add a new catalog item:

1) Place the model under `public/assets/models/glb/...` (or `.../special/...`).
2) Add an entry to `lib/items.ts` with a unique `id`, `name`, `kind`, and `model` path.
3) If it’s a new `kind`, extend `FurnitureKind` in `types.ts` and optionally add a default mapping in `MODEL_MAP` in `components/placed-item.tsx` (url/rotation/scale).

Customize snapping/placement:

- Doors/Windows offset uses wall thickness + item depth; tweak in `PlacedItem` for clearance and angles.
- Clamp movement inside room polygon by enhancing `ensureItemsInside()` and drag logic in `PlacedItem`.

## Suggested next steps (nice-to-haves)

- Persistence: auto-save/load store state from localStorage (in addition to manual Save/Load).
- Undo/Redo: state history for safe editing in 2D/3D.
- Snapping improvements: 0/90/45° in 2D; 15° snapping for 3D rotation.
- Mobile: reduce shadow quality and switch to `frameloop="demand"` when idle; simplify UI for touch.
- Export/Share: screenshot of the WebGL canvas; URL-encoded JSON design sharing.

## Troubleshooting

- Blank models or boxes: confirm the `model` path in `lib/items.ts` points to an existing `.glb` under `public/assets/models/glb`. Check browser console for 404s.
- Gizmo not moving: ensure an item is selected and that its Object3D is registered (it happens automatically via `PlacedItem`).

---

Maintainers note: keep `lib/store.ts` as the single source of truth for geometry and transforms. All 3D components should read from the store and emit changes via store actions to keep 2D/3D in sync.
