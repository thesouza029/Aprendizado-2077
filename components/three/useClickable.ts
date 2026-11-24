"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { useProgressStore } from "@/store/progress";

/** Arrastar a câmera não conta como clique: ignora se o ponteiro andou mais que isso (px) */
export const MAX_CLICK_DRIFT = 6;

/** No voo livre, clicar serve para pilotar (captura do mouse), não para viajar */
export const inFreeFlight = () => useProgressStore.getState().preferences.navMode === "free";

/** Hover com cursor de "mãozinha" e clique que ignora arrastos */
export function useClickable(onSelect: () => void, onHover?: (hovered: boolean) => void) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const update = (value: boolean) => {
    setHovered(value);
    onHover?.(value);
  };

  return {
    hovered,
    handlers: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!inFreeFlight()) update(true);
      },
      onPointerOut: () => update(false),
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (inFreeFlight() || e.delta > MAX_CLICK_DRIFT) return;
        onSelect();
      },
    },
  };
}
