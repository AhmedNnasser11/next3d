"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { usePlannerStore } from "@/lib/store";

// Subtle procedural ceiling texture to avoid external assets
function makeCeilingTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let i = 32; i < size; i += 32) {
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
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  return tex;
}

export function CeilingMesh() {
  const floorPolygon = usePlannerStore((s) => s.floorPolygon);
  const wallHeight = usePlannerStore((s) => s.wallHeight);
  const ceilingVisible = usePlannerStore((s) => s.ceilingVisible);
  const ceilingColor = usePlannerStore((s) => s.ceilingColor);
  const ceilingTexOn = usePlannerStore((s) => s.ceilingTexOn);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ceilingColor,
        map: ceilingTexOn ? makeCeilingTexture() : null,
        metalness: 0,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    [ceilingColor, ceilingTexOn]
  );

  const geometry = useMemo(() => {
    if (!floorPolygon.length) return new THREE.BufferGeometry();

    // Create a shape from the floor polygon
    const shape = new THREE.Shape();
    floorPolygon.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    });
    shape.closePath();

    // Extrude with minimal settings since we just need a flat shape
    const geometry = new THREE.ShapeGeometry(shape);
    
    // Rotate to be horizontal and position at wall height
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, [floorPolygon]);

  if (!ceilingVisible || !floorPolygon.length) return null;

  return (
    <mesh
      geometry={geometry}
      position={[0, wallHeight, 0]}
      material={material}
      receiveShadow
    />
  );
}