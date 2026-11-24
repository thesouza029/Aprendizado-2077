"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import { seededRandom, type Vec3 } from "@/lib/city-layout";
import { fadeInOut, showerMeteors, type SkyEvent } from "@/lib/sky-events";
import { useEventClock } from "./useEventClock";

const TAIL_LENGTH = 34;
const TAIL_WIDTH = 1.6;
const COLORS = ["#fef3c7", "#a5f3fc", "#f0abfc"];

/**
 * Cauda do meteoro: dois retângulos cruzados (visíveis de quase qualquer ângulo),
 * brancos na cabeça e pretos no fim. Com mistura aditiva, o preto some: vira um rastro que esmaece.
 */
function tailGeometry(): BufferGeometry {
  const w = TAIL_WIDTH / 2;
  const t = w * 0.15;
  const L = -TAIL_LENGTH;
  // prettier-ignore
  const positions = new Float32Array([
    0, -w, 0,   0, w, 0,   L, t, 0,   L, -t, 0, // plano vertical
    0, 0, -w,   0, 0, w,   L, 0, t,   L, 0, -t, // plano horizontal
  ]);
  // prettier-ignore
  const colors = new Float32Array([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return geometry;
}

type StreakProps = {
  start: Vec3;
  end: Vec3;
  duration: number;
  delay?: number;
  color: string;
  onDone?: () => void;
};

/** Um risco de luz cruzando o céu, com cabeça brilhante e cauda que some */
function MeteorStreak({ start, end, duration, delay = 0, color, onDone }: StreakProps) {
  const group = useRef<Group>(null);
  const geometry = useMemo(tailGeometry, []);
  const tail = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        side: DoubleSide,
      }),
    [],
  );
  const head = useMemo(
    () => new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      tail.dispose();
      head.dispose();
    },
    [geometry, tail, head],
  );

  const base = useMemo(() => new Color(color), [color]);
  const headBase = useMemo(() => new Color(color).lerp(new Color("#ffffff"), 0.6), [color]);
  const path = useMemo(() => new Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]), [start, end]);
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), path.clone().normalize()),
    [path],
  );

  useEventClock(
    duration,
    onDone,
    (p) => {
      const g = group.current;
      if (!g) return;
      g.visible = p >= 0 && p < 1;
      if (!g.visible) return;
      g.position.set(start[0] + path.x * p, start[1] + path.y * p, start[2] + path.z * p);
      const f = fadeInOut(p, 0.2);
      tail.color.copy(base).multiplyScalar(4 * f);
      head.color.copy(headBase).multiplyScalar(8 * f);
    },
    delay,
  );

  return (
    <group ref={group} quaternion={quaternion} visible={false}>
      <mesh geometry={geometry} material={tail} />
      <mesh material={head}>
        <sphereGeometry args={[0.8, 8, 6]} />
      </mesh>
    </group>
  );
}

type EventProps = { event: SkyEvent; onDone: () => void };

/** Estrela cadente: um meteoro só */
export function Meteor({ event, onDone }: EventProps) {
  const color = COLORS[event.seed % COLORS.length]!;
  return <MeteorStreak start={event.start} end={event.end} duration={event.duration} color={color} onDone={onDone} />;
}

/** Chuva de meteoros: vários riscos quase paralelos, em momentos diferentes */
export function MeteorShower({ event, onDone }: EventProps) {
  const meteors = useMemo(() => showerMeteors(event), [event]);
  const colors = useMemo(() => {
    const rand = seededRandom(event.seed + 1);
    return meteors.map(() => COLORS[Math.floor(rand() * COLORS.length)]!);
  }, [event.seed, meteors]);
  useEventClock(event.duration, onDone, () => {});

  return (
    <>
      {meteors.map((m, i) => (
        <MeteorStreak key={i} start={m.start} end={m.end} duration={m.duration} delay={m.delay} color={colors[i]!} />
      ))}
    </>
  );
}
