"use client";

import { Button } from "@/components/ui/button";
import {
  Home,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { usePlannerStore } from "@/lib/store";
import * as THREE from "three";

type Orbit = {
  object: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  update: () => void;
};

function pan(controls: Orbit | null, dx: number, dy: number) {
  if (!controls) return;
  const camera = controls.object as THREE.PerspectiveCamera;
  const panSpeed = 0.5;
  const panRight = new THREE.Vector3();
  const panUp = new THREE.Vector3();

  panRight.setFromMatrixColumn(camera.matrix, 0); // X axis
  panUp.setFromMatrixColumn(camera.matrix, 1); // Y axis (camera's up in view space)
  // Move in world units
  panRight.multiplyScalar(-dx * panSpeed);
  panUp.multiplyScalar(dy * panSpeed);
  const move = panRight.add(panUp);

  camera.position.add(move);
  controls.target.add(move);
  controls.update();
}

export function CameraControlsPanel() {
  const controls = usePlannerStore((s) => s._orbitControls);

  const zoomIn = () => {
    if (!controls) return;
    const anyCtrl = controls as unknown as {
      dollyIn?: (s: number) => void;
      update: () => void;
    };
    if (anyCtrl.dollyIn) anyCtrl.dollyIn(1.1);
    anyCtrl.update();
  };

  const zoomOut = () => {
    if (!controls) return;
    const anyCtrl = controls as unknown as {
      dollyOut?: (s: number) => void;
      update: () => void;
    };
    if (anyCtrl.dollyOut) anyCtrl.dollyOut(1.1);
    anyCtrl.update();
  };

  const reset = () => {
    if (!controls) return;
    controls.reset();
    controls.update();
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={reset}
          aria-label="Reset view"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => pan(controls, 1, 0)}
          aria-label="Pan left"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => pan(controls, 0, 1)}
            aria-label="Pan up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => pan(controls, 0, -1)}
            aria-label="Pan down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => pan(controls, -1, 0)}
          aria-label="Pan right"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
