"use client";

import { create } from "zustand";
import { resolveTier, type GraphicsTier } from "@/lib/quality";
import { useProgressStore } from "./progress";

/** Guardado só na sessão: ao abrir o navegador de novo, a cidade 3D ganha outra chance */
const FALLBACK_KEY = "devcity-perf-fallback";

function readFallback(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(FALLBACK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFallback(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(FALLBACK_KEY, "1");
    else window.sessionStorage.removeItem(FALLBACK_KEY);
  } catch {
    // modo privado sem sessionStorage: vale só até recarregar
  }
}

type PerformanceState = {
  /** 0 (mínimo) a 1 (máximo); null até a cidade abrir e avaliar o aparelho */
  factor: number | null;
  /** fps muito baixo mesmo com tudo reduzido (o usuário escolheu 3D, então só avisamos) */
  struggling: boolean;
  /** nesta sessão a cidade foi trocada pelo modo 2D por falta de desempenho */
  fallback2d: boolean;
  setFactor: (factor: number) => void;
  setStruggling: (value: boolean) => void;
  activateFallback: () => void;
  clearFallback: () => void;
};

export const usePerformanceStore = create<PerformanceState>()((set) => ({
  factor: null,
  struggling: false,
  fallback2d: readFallback(),
  setFactor: (factor) => set({ factor }),
  setStruggling: (struggling) => set({ struggling }),
  activateFallback: () => {
    writeFallback(true);
    set({ fallback2d: true, struggling: false });
  },
  clearFallback: () => {
    writeFallback(false);
    set({ fallback2d: false, struggling: false });
  },
}));

/** Nível de detalhe em uso agora: o escolhido pelo usuário ou o que o monitor de fps decidiu */
export function useGraphicsTier(): GraphicsTier {
  const graphics = useProgressStore((s) => s.preferences.graphics);
  const factor = usePerformanceStore((s) => s.factor);
  return resolveTier(graphics, factor ?? 1);
}
