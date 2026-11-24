"use client";

import { Canvas } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AmbientSound } from "@/components/ui/city/AmbientSound";
import { CityHud } from "@/components/ui/city/CityHud";
import { CityLabels } from "@/components/ui/city/CityLabels";
import { CityPanel } from "@/components/ui/city/CityPanel";
import { PerformanceNotice } from "@/components/ui/city/PerformanceNotice";
import { buildCityLayout, type Vec3 } from "@/lib/city-layout";
import type { CityData } from "@/lib/city-types";
import { dprFor, initialQualityFactor } from "@/lib/quality";
import { usePerformanceStore } from "@/store/performance";
import { useProgressStore } from "@/store/progress";
import { CityScene } from "./CityScene";

export type CityExperienceProps = { data: CityData };

/**
 * A cidade 3D completa: cena (Canvas), HUD e painel 2D por cima.
 * Carregada só no navegador (dynamic import com ssr: false), porque WebGL não existe no servidor.
 */
export default function CityExperience({ data }: CityExperienceProps) {
  const t = useTranslations("city");
  const tHub = useTranslations("hub");

  const layout = useMemo(
    () =>
      buildCityLayout(
        data.districts.map((d) => ({
          id: d.id,
          kind: d.kind,
          projects: d.projects.map((p) => ({ id: p.id, steps: p.steps.length })),
        })),
      ),
    [data],
  );

  // começa na última posição visitada (salva no navegador) ou na visão geral
  const [start] = useState<{ position: Vec3; target: Vec3 }>(() => {
    const last = useProgressStore.getState().lastPosition;
    return last
      ? { position: last, target: [0, 8, 0] }
      : { position: layout.overview.position, target: layout.overview.target };
  });

  // qualidade inicial pelo aparelho (só na primeira vez da sessão); depois o monitor de fps ajusta
  const [initialFactor] = useState(() => usePerformanceStore.getState().factor ?? detectQualityFactor());
  useEffect(() => {
    const perf = usePerformanceStore.getState();
    if (perf.factor === null) perf.setFactor(initialFactor);
  }, [initialFactor]);
  const factor = usePerformanceStore((s) => s.factor) ?? initialFactor;
  const graphics = useProgressStore((s) => s.preferences.graphics);
  const dpr = dprFor(graphics, factor, window.devicePixelRatio || 1);

  // enquanto a cidade ocupa a tela, o rodapé fica escondido (senão receberia foco invisível)
  useEffect(() => {
    document.body.dataset.city = "on";
    return () => {
      delete document.body.dataset.city;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0" role="region" aria-label={t("regionLabel")}>
      {/* a página continua tendo um título principal para leitores de tela */}
      <h1 className="sr-only">{tHub("title")}</h1>
      <Canvas
        aria-hidden
        camera={{ position: start.position, fov: 50, near: 0.5, far: 800 }}
        dpr={dpr}
        // o antisserrilhado fica com o pós-processamento (multisampling do EffectComposer)
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <CityScene layout={layout} data={data} initialTarget={start.target} />
        </Suspense>
      </Canvas>
      <CityLabels layout={layout} data={data} />
      <CityHud layout={layout} data={data} />
      <CityPanel layout={layout} data={data} />
      <PerformanceNotice />
      <AmbientSound />
    </div>
  );
}

/** Avalia o aparelho pelo que o navegador informa (núcleos, memória, tela de toque) */
function detectQualityFactor(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return initialQualityFactor({
    cores: nav.hardwareConcurrency || undefined,
    memoryGB: nav.deviceMemory,
    coarse: window.matchMedia("(pointer: coarse)").matches,
  });
}
