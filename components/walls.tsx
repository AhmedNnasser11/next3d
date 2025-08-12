"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { usePlannerStore } from "@/lib/store";

// Subtle procedural wall texture to avoid external assets
function makeWallTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  for (let i = 16; i < size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
}

function WallMesh({
  id,
  a,
  b,
  height,
  thickness,
  normal,
}: {
  id: string;
  a: [number, number];
  b: [number, number];
  height: number;
  thickness: number;
  normal: [number, number];
}) {
  const register = usePlannerStore((s) => s.registerWallObject);
  const unregister = usePlannerStore((s) => s.unregisterWallObject);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: makeWallTexture(),
        metalness: 0,
        roughness: 1,
      }),
    []
  );

  const { pos, rot, len } = useMemo(() => {
    const ax = a[0],
      az = a[1];
    const bx = b[0],
      bz = b[1];
    const mid: [number, number] = [(ax + bx) / 2, (az + bz) / 2];
    const dir = new THREE.Vector2(bx - ax, bz - az);
    const length = dir.length();
    const angle = Math.atan2(dir.y, dir.x);
    // Shift outward so the inner face aligns with floor polygon boundary
    const offX = normal[0] * (thickness / 2);
    const offZ = normal[1] * (thickness / 2);
    return {
      pos: [mid[0] + offX, height / 2, mid[1] + offZ] as [
        number,
        number,
        number
      ],
      rot: [0, -angle, 0] as [number, number, number],
      len: length,
    };
  }, [a, b, height, thickness, normal]);

  return (
    <mesh
      position={pos}
      rotation={rot}
      ref={(ref: THREE.Mesh | null) => {
        if (ref) register(id, ref as THREE.Mesh, normal as [number, number]);
        else unregister(id);
      }}
      userData={{ wallId: id, normal }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[len, height, thickness]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function Walls() {
  const walls = usePlannerStore((s) => s.walls);
  const wallH = usePlannerStore((s) => s.wallHeight);
  const wallT = usePlannerStore((s) => s.wallThickness);
  if (!walls.length) return null;
  return (
    <>
      {walls.map((w) => (
        <WallMesh
          key={w.id}
          id={w.id}
          a={w.a}
          b={w.b}
          height={wallH}
          thickness={wallT}
          normal={w.normal}
        />
      ))}
    </>
  );
}
