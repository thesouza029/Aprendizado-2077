"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import type { LabelAnchor } from "@/lib/city-layout";
import { labelElements } from "@/lib/city-runtime";

/**
 * Projeta a posição 3D de cada letreiro na tela e move o elemento DOM correspondente
 * (renderizado fora do Canvas, em CityLabels). Assim os letreiros ficam sempre virados
 * para a câmera, com tamanho legível, sem criar uma raiz React por letreiro.
 */
export function LabelProjector({ anchors }: { anchors: LabelAnchor[] }) {
  const v = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = labelElements.get(a.id);
      if (!el) continue;
      v.set(a.position[0], a.position[1], a.position[2]).project(camera);
      // atrás da câmera (z > 1) ou bem fora da tela: esconde
      const onScreen = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      if (!onScreen) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}
