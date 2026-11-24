"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * false no servidor e durante a hidratação; true depois.
 * Evita divergência entre o HTML do servidor (sem progresso) e o cliente (com localStorage).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Reage a uma media query (ex.: "(pointer: coarse)" para telas de toque). false no servidor. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
