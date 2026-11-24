"use client";

import { Stars } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import {
  collisionBoxes,
  flightLimits,
  labelAnchors,
  type CityLayout,
  type Vec3,
} from "@/lib/city-layout";
import type { CityData } from "@/lib/city-types";
import { TIER_SETTINGS } from "@/lib/quality";
import { prefersReducedMotion } from "@/lib/view-mode";
import { useGraphicsTier } from "@/store/performance";
import { useProgressStore } from "@/store/progress";
import { CameraRig } from "./CameraRig";
import { CameraTracker } from "./CameraTracker";
import { District } from "./District";
import { Effects } from "./Effects";
import { Fillers } from "./Fillers";
import { FlyingTraffic } from "./FlyingTraffic";
import { FreeFlight } from "./FreeFlight";
import { LabelProjector } from "./LabelProjector";
import { Plaza } from "./Plaza";
import { QualityMonitor } from "./QualityMonitor";
import { Rain } from "./Rain";
import { SkyDome } from "./SkyDome";
import { SkyEvents } from "./sky/SkyEvents";
import { WetGround } from "./WetGround";

const FOG = "#080a1a";
/** intervalo entre um distrito e o próximo aparecerem (carregamento progressivo) */
const REVEAL_MS = 160;

/** Os distritos sobem do chão só na primeira vez que a cidade abre nesta aba */
let revealedOnce = false;

/** Quantos distritos já apareceram: um por vez, para a primeira imagem sair rápido */
function useProgressiveReveal(total: number): { count: number; animate: boolean } {
  const [animate] = useState(() => !revealedOnce && !prefersReducedMotion());
  const [count, setCount] = useState(animate ? 0 : total);
  useEffect(() => {
    if (count >= total) {
      revealedOnce = true;
      return;
    }
    const id = window.setTimeout(() => setCount((n) => n + 1), count === 0 ? 250 : REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [count, total]);
  return { count, animate };
}

type Props = { layout: CityLayout; data: CityData; initialTarget: Vec3 };

/** Tudo que existe dentro do <Canvas> */
export function CityScene({ layout, data, initialTarget }: Props) {
  const navMode = useProgressStore((s) => s.preferences.navMode);
  const rain = useProgressStore((s) => s.preferences.rain);
  const skyEvents = useProgressStore((s) => s.preferences.skyEvents);
  // nível de detalhe: escolhido pelo usuário ou ajustado sozinho pelo fps (QualityMonitor)
  const quality = TIER_SETTINGS[useGraphicsTier()];
  const reveal = useProgressiveReveal(layout.districts.length);
  const boxes = useMemo(() => collisionBoxes(layout), [layout]);
  const limits = useMemo(() => flightLimits(layout), [layout]);
  const anchors = useMemo(() => labelAnchors(layout), [layout]);

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fogExp2 attach="fog" args={[FOG, 0.0036]} />
      <SkyDome />
      <Stars radius={320} depth={60} count={quality.stars} factor={4} saturation={0} fade speed={0.4} />

      {/* pouca luz "de verdade": quem ilumina a cidade é o neon */}
      <hemisphereLight args={["#5b6cff", "#05060d", 0.35]} />
      <ambientLight intensity={0.18} />
      <directionalLight position={[60, 120, 40]} intensity={0.35} color="#9db4ff" />

      <WetGround size={layout.cityRadius * 3} reflector={quality.reflector} />
      <Plaza layout={layout} color={data.hubColor} />

      {layout.districts.slice(0, reveal.count).map((d) => {
        const districtData = data.districts.find((x) => x.id === d.id);
        return districtData ? <District key={d.id} layout={d} data={districtData} rise={reveal.animate} /> : null;
      })}

      <Fillers fillers={layout.fillers} />
      <FlyingTraffic layout={layout} count={quality.traffic} />
      {rain && <Rain count={quality.rain} />}
      {skyEvents && <SkyEvents />}

      {navMode === "free" ? (
        <FreeFlight boxes={boxes} limits={limits} />
      ) : (
        <CameraRig initialTarget={initialTarget} />
      )}
      <CameraTracker />
      <LabelProjector anchors={anchors} />

      <Effects multisampling={quality.multisampling} bloomLevels={quality.bloomLevels} />
      <QualityMonitor />
    </>
  );
}
