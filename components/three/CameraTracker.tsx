"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import { cameraPose } from "@/lib/city-runtime";

/** Copia a posição e a direção da câmera para o minimapa, a cada quadro */
export function CameraTracker() {
  const dir = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    camera.getWorldDirection(dir);
    const len = Math.hypot(dir.x, dir.z) || 1;
    cameraPose.x = camera.position.x;
    cameraPose.z = camera.position.z;
    cameraPose.dirX = dir.x / len;
    cameraPose.dirZ = dir.z / len;
  });

  return null;
}
