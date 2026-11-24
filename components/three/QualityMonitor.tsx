"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { registerDevTool } from "@/lib/dev-tools";
import { FALLBACK, QUALITY_STEP, isAtMinimum, shouldFallback } from "@/lib/quality";
import { usePerformanceStore } from "@/store/performance";
import { useProgressStore } from "@/store/progress";

/** Depois de tantas trocas de qualidade, para de ajustar (evita ficar alternando entre dois níveis) */
const MAX_QUALITY_CHANGES = 8;

/** últimas medições de fps (só para a ferramenta de desenvolvimento) */
let recentFps: number[] = [];

/**
 * Vigia o fps dentro do <Canvas>:
 * - no modo de gráficos "Automático", o PerformanceMonitor do drei sobe ou desce a qualidade
 *   (resolução, reflexo, bloom, chuva, carros) conforme o aparelho aguenta;
 * - se mesmo no mínimo continuar travando, troca a cidade pelo modo 2D (ou avisa, se o 3D foi escolhido).
 */
export function QualityMonitor() {
  const graphics = useProgressStore((s) => s.preferences.graphics);
  const setFactor = usePerformanceStore((s) => s.setFactor);
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  // trocas de qualidade desde a última vez que a aba ficou visível; muitas = oscilando, então para
  const [changes, setChanges] = useState({ epoch: 0, count: 0 });
  if (changes.epoch !== epoch) setChanges({ epoch, count: 0 });

  // espera a cena assentar: os primeiros quadros são lentos por causa da compilação de shaders
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), FALLBACK.warmupSeconds * 1000);
    return () => window.clearTimeout(id);
  }, []);

  // com a aba escondida o navegador pausa a animação; ao voltar, a medição recomeça do zero
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") setEpoch((e) => e + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // em desenvolvimento: window.__devcity.quality() mostra o fator atual e os avisos
  useEffect(
    () =>
      registerDevTool("quality", () => ({
        ...usePerformanceStore.getState(),
        ready,
        changes: changes.count,
        fps: recentFps.map(Math.round),
      })),
    [ready, changes.count],
  );

  if (!ready) return null;

  return (
    <>
      {graphics === "auto" && changes.count < MAX_QUALITY_CHANGES && (
        <PerformanceMonitor
          key={epoch}
          factor={usePerformanceStore.getState().factor ?? 1}
          step={QUALITY_STEP}
          onChange={({ factor }) => {
            // o drei também avisa quando o fator não mudou (já no máximo ou no mínimo): isso não conta
            if (usePerformanceStore.getState().factor === factor) return;
            setFactor(factor);
            setChanges((c) => ({ epoch: c.epoch, count: c.count + 1 }));
          }}
        />
      )}
      <FallbackWatch key={`watch-${epoch}`} />
    </>
  );
}

/** Mede o fps de cada segundo e decide se a cidade deve dar lugar ao modo 2D */
function FallbackWatch() {
  const history = useRef<number[]>([]);
  const win = useRef({ start: 0, frames: 0, last: 0 });

  useFrame(() => {
    const now = performance.now() / 1000;
    const w = win.current;
    // pausa longa entre quadros (aba em segundo plano, travada pontual): começa uma medição nova
    if (w.last === 0 || now - w.last > FALLBACK.maxFrameGap) {
      w.start = now;
      w.frames = 0;
    }
    w.last = now;
    w.frames++;
    const elapsed = now - w.start;
    if (elapsed < FALLBACK.windowSeconds) return;

    const h = history.current;
    h.push((w.frames - 1) / elapsed);
    if (h.length > 10) h.shift();
    recentFps = [...h];
    w.start = now;
    w.frames = 1;

    const { graphics, viewMode } = useProgressStore.getState().preferences;
    const perf = usePerformanceStore.getState();
    if (!shouldFallback(h, isAtMinimum(graphics, perf.factor ?? 1))) return;

    h.length = 0;
    if (viewMode === "auto") perf.activateFallback();
    else if (!perf.struggling) perf.setStruggling(true);
  });

  return null;
}
