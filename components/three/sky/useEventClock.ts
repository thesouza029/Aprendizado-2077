"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/**
 * Relógio de um evento do céu: chama `onTick(progresso 0→1, segundos desde o início)` a cada quadro
 * e `onDone` uma única vez no fim. Com `delay`, o progresso fica negativo até a hora de começar.
 */
export function useEventClock(
  duration: number,
  onDone: (() => void) | undefined,
  onTick: (progress: number, elapsed: number) => void,
  delay = 0,
) {
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const tick = useRef(onTick);
  const finish = useRef(onDone);
  useEffect(() => {
    tick.current = onTick;
    finish.current = onDone;
  });

  useFrame(({ clock }) => {
    if (done.current) return;
    start.current ??= clock.elapsedTime + delay;
    const elapsed = clock.elapsedTime - start.current;
    const progress = elapsed / duration;
    if (progress >= 1) {
      done.current = true;
      tick.current(1, duration);
      finish.current?.();
      return;
    }
    tick.current(progress, elapsed);
  });
}

/** Ângulo (em torno do eixo y) que aponta o eixo +x do modelo na direção de start → end */
export function headingOf(start: readonly number[], end: readonly number[]): number {
  return Math.atan2(-((end[2] ?? 0) - (start[2] ?? 0)), (end[0] ?? 0) - (start[0] ?? 0));
}
