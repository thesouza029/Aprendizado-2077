"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, type Group } from "three";
import { fadeInOut, type SkyEvent } from "@/lib/sky-events";
import { hullMaterial, lightMaterial } from "./materials";
import { headingOf, useEventClock } from "./useEventClock";

const CONTAINERS = ["#7c2d12", "#1e3a8a", "#14532d", "#78350f", "#4c1d95", "#0f766e"];
const ENGINE = new Color("#38bdf8");
const AMBER = new Color("#fbbf24");
const WINDOWS = new Color("#67e8f9");
const RED = new Color("#ff3355");
const GREEN = new Color("#34d399");
const WHITE = new Color("#ffffff");

type Props = { event: SkyEvent; onDone: () => void };

/**
 * Nave cargueira: casco comprido com contêineres em cima, três motores azuis atrás,
 * fileira de luzes âmbar por baixo e luzes de navegação (vermelha à esquerda, verde à direita).
 */
export function CargoShip({ event, onDone }: Props) {
  const group = useRef<Group>(null);
  const m = useMemo(
    () => ({
      hull: hullMaterial("#151a2b"),
      dark: hullMaterial("#0e1220"),
      containers: CONTAINERS.map((c) => hullMaterial(c)),
      engine: lightMaterial(),
      strip: lightMaterial(),
      windows: lightMaterial(),
      port: lightMaterial(),
      starboard: lightMaterial(),
      strobe: lightMaterial(),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const mat of [m.hull, m.dark, ...m.containers, m.engine, m.strip, m.windows, m.port, m.starboard, m.strobe]) mat.dispose();
    },
    [m],
  );

  const yaw = headingOf(event.start, event.end);
  const [sx, sy, sz] = event.start;
  const [ex, ey, ez] = event.end;

  useEventClock(event.duration, onDone, (p, t) => {
    const g = group.current;
    if (!g) return;
    g.position.set(sx + (ex - sx) * p, sy + (ey - sy) * p + Math.sin(t * 0.4) * 0.5, sz + (ez - sz) * p);
    const f = fadeInOut(p, 0.06);
    for (const mat of [m.hull, m.dark, ...m.containers]) mat.opacity = f;
    m.engine.color.copy(ENGINE).multiplyScalar((4.5 + Math.sin(t * 9) * 0.5) * f);
    m.strip.color.copy(AMBER).multiplyScalar(2.2 * f);
    m.windows.color.copy(WINDOWS).multiplyScalar(1.6 * f);
    const blink = Math.sin(t * 2.5) > 0.2 ? 5 : 0.3;
    m.port.color.copy(RED).multiplyScalar(blink * f);
    m.starboard.color.copy(GREEN).multiplyScalar(blink * f);
    m.strobe.color.copy(WHITE).multiplyScalar((t % 2 < 0.1 ? 7 : 0.1) * f);
  });

  return (
    <group ref={group} position={event.start} rotation={[0, yaw, 0]}>
      <mesh material={m.hull}>
        <boxGeometry args={[26, 3.6, 8]} />
      </mesh>
      {/* proa em pirâmide */}
      <mesh material={m.hull} position={[16.5, 0, 0]} rotation={[Math.PI / 4, 0, -Math.PI / 2]}>
        <coneGeometry args={[2.6, 7, 4]} />
      </mesh>
      {/* ponte de comando */}
      <mesh material={m.dark} position={[-8, 3.3, 0]}>
        <boxGeometry args={[5, 3, 5]} />
      </mesh>
      <mesh material={m.strobe} position={[-8, 5, 0]}>
        <sphereGeometry args={[0.3, 8, 6]} />
      </mesh>
      {/* contêineres */}
      {m.containers.map((mat, i) => (
        <mesh key={i} material={mat} position={[-2 + (i % 3) * 4, 3.1, i < 3 ? -1.5 : 1.5]}>
          <boxGeometry args={[3.6, 2.6, 2.7]} />
        </mesh>
      ))}
      {/* motores */}
      {[-2.6, 0, 2.6].map((z) => (
        <group key={z} position={[-13.6, 0, z]}>
          <mesh material={m.dark} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.1, 1.3, 2, 16]} />
          </mesh>
          <mesh material={m.engine} position={[-1.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[1, 16]} />
          </mesh>
        </group>
      ))}
      {/* fileira de luzes por baixo */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} material={m.strip} position={[-10 + i * 3, -1.9, 0]}>
          <boxGeometry args={[0.9, 0.15, 0.5]} />
        </mesh>
      ))}
      {/* faixas de janelas nas laterais: o casco escuro precisa de luz para aparecer à noite */}
      {[-4.02, 4.02].map((z) => (
        <mesh key={z} material={m.windows} position={[1, 0.6, z]}>
          <boxGeometry args={[22, 0.35, 0.05]} />
        </mesh>
      ))}
      {/* navegação: +z é a direita da nave (eixo x para a frente, y para cima) */}
      <mesh material={m.port} position={[0, 0, -4.2]}>
        <sphereGeometry args={[0.35, 8, 6]} />
      </mesh>
      <mesh material={m.starboard} position={[0, 0, 4.2]}>
        <sphereGeometry args={[0.35, 8, 6]} />
      </mesh>
    </group>
  );
}
