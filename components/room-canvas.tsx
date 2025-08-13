"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  Grid,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect } from "react";
import { usePlannerStore } from "@/lib/store";
import { TransformToolbar } from "@/components/transform-toolbar";
import { FloorMesh } from "./floor";
import { Walls } from "./walls";
import { PlacedItem } from "./placed-item";
import { CeilingMesh } from "./ceiling";

function AutoHideFrontWall() {
  const { camera } = useThree();
  const wallRefs = usePlannerStore((s) => s._wallObjects);
  const wallData = usePlannerStore((s) => s.walls);
  const roomCenter = usePlannerStore((s) => s.roomCenter);

  useFrame(() => {
    if (!wallData.length) return;
    // Unhide all
    for (const w of wallData) {
      const ref = wallRefs[w.id];
      if (ref) ref.visible = true;
    }

    // Ray to center in XZ
    const ox = camera.position.x;
    const oz = camera.position.z;
    const dx0 = roomCenter[0] - ox;
    const dz0 = roomCenter[2] - oz;
    const dLen = Math.hypot(dx0, dz0) || 1;
    const dx = dx0 / dLen;
    const dz = dz0 / dLen;

    let bestT = Number.POSITIVE_INFINITY;
    let bestId: string | null = null;

    for (const w of wallData) {
      const ax = w.a[0],
        az = w.a[1];
      const bx = w.b[0],
        bz = w.b[1];
      const sx = bx - ax;
      const sz = bz - az;

      const det = dx * -sz - dz * -sx;
      if (Math.abs(det) < 1e-6) continue;

      const rhsx = ax - ox;
      const rhsz = az - oz;
      const t = (rhsx * -sz - rhsz * -sx) / det;
      const u = (dx * rhsz - dz * rhsx) / det;

      if (t > 0 && u >= 0 && u <= 1) {
        if (t < bestT) {
          bestT = t;
          bestId = w.id;
        }
      }
    }

    if (bestId) {
      const ref = wallRefs[bestId];
      if (ref) ref.visible = false;
    }
  });

  return null;
}

export function RoomCanvas() {
  const items = usePlannerStore((s) => s.placed);
  const setControls = usePlannerStore((s) => s._setOrbitControls);
  const controls = usePlannerStore((s) => s._orbitControls);
  const selectedId = usePlannerStore((s) => s.selectedId);
  const setSelected = usePlannerStore((s) => s.setSelected);
  const transformMode = usePlannerStore((s) => s.transformMode);
  const setItemTransform = usePlannerStore((s) => s.setItemTransform);
  const objects = usePlannerStore((s) => s._objects);

  useEffect(() => {
    if (!controls) return;
    controls.enabled = selectedId == null;
    controls.update();
  }, [controls, selectedId]);

  return (
    <div className="relative w-full h-full">
      {/* 3D View Controls Helper */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-2 rounded-md shadow-md text-sm">
        <div className="text-xs font-medium mb-1">3D Controls:</div>
        <div className="text-xs">• Rotate: Left-click + Drag</div>
        <div className="text-xs">• Pan: Right-click + Drag</div>
        <div className="text-xs">• Zoom: Scroll wheel</div>
        <div className="text-xs">• Select item: Click on furniture</div>
      </div>
      <Canvas
        className="w-full h-full bg-gradient-to-b from-blue-50 to-white"
        shadows
        onPointerMissed={() => setSelected(null)}
      >
        <Suspense
          fallback={
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#10b981" wireframe={true} />
            </mesh>
          }
        >
          <PerspectiveCamera makeDefault position={[5, 3, 7]} fov={50} />
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
          <Environment preset="apartment" />

          <Grid
            args={[50, 50]}
            cellSize={0.5}
            sectionSize={2}
            cellColor="#e5e7eb"
            sectionColor="#9ca3af"
            position={[0, -0.02, 0]} // push grid down to avoid z-fight with floor/wall seam
          />

          <OrbitControls
            ref={(ref) => setControls(ref || null)}
            enableDamping
            dampingFactor={0.08}
            minDistance={1}
            maxDistance={20}
            target={[0, 0, 0]}
          />

          <FloorMesh />
          <Walls />
          <CeilingMesh />
          <AutoHideFrontWall />

          {items.map((it) => (
            <PlacedItem key={it.id} item={it} />
          ))}

          {/* Transform gizmo for selected item */}
          {selectedId && objects[selectedId] && (
            <TransformControls
              object={objects[selectedId] as THREE.Object3D}
              mode={transformMode}
              enabled={true}
              showX
              showY
              showZ
              onMouseDown={() => {
                if (controls) controls.enabled = false;
              }}
              onMouseUp={() => {
                if (controls) controls.enabled = true;
              }}
              onObjectChange={() => {
                const obj = objects[selectedId] as THREE.Object3D;
                const sel = items.find((i) => i.id === selectedId);
                if (!obj || !sel) return;
                setItemTransform(sel.id, {
                  position: [obj.position.x, obj.position.y, obj.position.z],
                  rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                  scale: sel.scale,
                });
              }}
            />
          )}
        </Suspense>
      </Canvas>

      <TransformToolbar />
    </div>
  );
}
