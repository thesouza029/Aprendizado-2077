"use client";

import { useEffect } from "react";
import { startAmbient, stopAmbient } from "@/lib/ambient-audio";
import { useProgressStore } from "@/store/progress";

type ActivationNavigator = Navigator & { userActivation?: { hasBeenActive: boolean } };

/**
 * Liga/desliga a trilha ambiente conforme a preferência (desligada por padrão).
 * Navegadores só deixam tocar som depois de um clique ou tecla: se a preferência
 * já vier ligada de outra visita, a música espera a primeira interação.
 */
export function AmbientSound() {
  const sound = useProgressStore((s) => s.preferences.sound);

  useEffect(() => {
    if (!sound) return;
    const start = () => {
      startAmbient();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    if ((navigator as ActivationNavigator).userActivation?.hasBeenActive) start();
    else {
      window.addEventListener("pointerdown", start);
      window.addEventListener("keydown", start);
    }
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      stopAmbient();
    };
  }, [sound]);

  return null;
}
