"use client";

import { usePerformanceStore } from "@/store/performance";
import { useProgressStore } from "@/store/progress";
import { useHydrated } from "./hooks";

export type ResolvedViewMode = "pending" | "3d" | "2d";
export type ViewModeReason = "preference" | "no-webgl" | "reduced-motion" | "performance" | null;

let webglCache: boolean | null = null;

/** O navegador consegue desenhar 3D? (resultado guardado após a primeira checagem) */
export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Decide entre cidade 3D e modo 2D.
 * "pending" no servidor e durante a hidratação (aí mostramos o 2D, que já vem renderizado).
 */
export function useViewMode(): { mode: ResolvedViewMode; webgl: boolean; reason: ViewModeReason } {
  const hydrated = useHydrated();
  const preference = useProgressStore((s) => s.preferences.viewMode);
  const fallback2d = usePerformanceStore((s) => s.fallback2d);

  if (!hydrated) return { mode: "pending", webgl: true, reason: null };
  const webgl = hasWebGL();
  if (preference === "2d") return { mode: "2d", webgl, reason: "preference" };
  if (!webgl) return { mode: "2d", webgl, reason: "no-webgl" };
  if (preference === "auto" && prefersReducedMotion()) {
    return { mode: "2d", webgl, reason: "reduced-motion" };
  }
  // a cidade ficou lenta demais neste aparelho (só no modo automático; quem escolheu 3D só é avisado)
  if (preference === "auto" && fallback2d) return { mode: "2d", webgl, reason: "performance" };
  return { mode: "3d", webgl, reason: null };
}
