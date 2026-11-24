"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, FrontSide, type Group } from "three";
import { BLIMP_MESSAGES, fadeInOut, type SkyEvent } from "@/lib/sky-events";
import { glowMaterial, hologramTexture, hullMaterial, lightMaterial } from "./materials";
import { headingOf, useEventClock } from "./useEventClock";

const PANEL_COLORS = ["#ff2fd0", "#22d3ee", "#a78bfa"];
const RED = new Color("#ff3355");
const WHITE = new Color("#ffffff");
const CYAN = new Color("#22d3ee");

type Props = { event: SkyEvent; onDone: () => void };

/**
 * Dirigível publicitário: casco escuro, painéis holográficos com uma mensagem de dev,
 * luzes de navegação piscando e um holofote varrendo a cidade lá embaixo.
 */
export function Blimp({ event, onDone }: Props) {
  const group = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const message = BLIMP_MESSAGES[event.seed % BLIMP_MESSAGES.length]!;
  const panelColor = PANEL_COLORS[event.seed % PANEL_COLORS.length]!;
  const ringColor = useMemo(() => new Color(panelColor), [panelColor]);

  const m = useMemo(() => {
    const texture = hologramTexture(message, panelColor);
    const panel = glowMaterial("#ffffff", 0.9);
    panel.map = texture;
    panel.side = FrontSide; // cada lado tem o seu painel: nada de texto espelhado
    panel.color.setScalar(1.25);
    return {
      texture,
      hull: hullMaterial("#1b2036"),
      fin: hullMaterial("#141829"),
      panel,
      beam: glowMaterial("#7dd3fc", 0.025),
      nose: lightMaterial(),
      tail: lightMaterial(),
      gondola: lightMaterial(),
      // anéis neon em volta do casco: sem eles, o casco escuro some contra a cidade à noite
      rings: lightMaterial(),
    };
  }, [message, panelColor]);
  useEffect(
    () => () => {
      m.texture.dispose();
      for (const mat of [m.hull, m.fin, m.panel, m.beam, m.nose, m.tail, m.gondola, m.rings]) mat.dispose();
    },
    [m],
  );

  const yaw = headingOf(event.start, event.end);
  const [sx, sy, sz] = event.start;
  const [ex, ey, ez] = event.end;

  useEventClock(event.duration, onDone, (p, t) => {
    const g = group.current;
    if (!g) return;
    g.position.set(sx + (ex - sx) * p, sy + (ey - sy) * p + Math.sin(t * 0.5) * 0.8, sz + (ez - sz) * p);
    const f = fadeInOut(p, 0.06);
    m.hull.opacity = f;
    m.fin.opacity = f;
    // holograma oscila e, de vez em quando, dá uma piscada
    m.panel.opacity = f * (0.8 + Math.sin(t * 3.1) * 0.08 + (Math.sin(t * 17) > 0.96 ? -0.4 : 0));
    m.beam.opacity = f * 0.025;
    m.nose.color.copy(WHITE).multiplyScalar((t % 1.6 < 0.12 ? 6 : 0.2) * f);
    m.tail.color.copy(RED).multiplyScalar((Math.sin(t * 3) > 0.3 ? 5 : 0.4) * f);
    m.gondola.color.copy(CYAN).multiplyScalar(2.5 * f);
    m.rings.color.copy(ringColor).multiplyScalar(2.2 * f);
    if (beam.current) {
      beam.current.rotation.z = Math.sin(t * 0.6) * 0.35;
      beam.current.rotation.x = Math.cos(t * 0.45) * 0.2;
    }
  });

  return (
    <group ref={group} position={event.start} rotation={[0, yaw, 0]}>
      <mesh material={m.hull} scale={[11, 3.4, 3.4]}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {/* anéis neon (o casco é um elipsoide: o raio diminui perto das pontas) */}
      {[-5, 0.5, 6].map((x) => {
        const r = 3.4 * Math.sqrt(1 - (x / 11) ** 2) + 0.05;
        return (
          <mesh key={x} material={m.rings} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[r, 0.12, 6, 40]} />
          </mesh>
        );
      })}
      {/* lemes da cauda */}
      <mesh material={m.fin} position={[-9.4, 2.4, 0]}>
        <boxGeometry args={[3, 2.6, 0.2]} />
      </mesh>
      <mesh material={m.fin} position={[-9.4, -2.4, 0]}>
        <boxGeometry args={[3, 2.6, 0.2]} />
      </mesh>
      <mesh material={m.fin} position={[-9.4, 0, 2.4]}>
        <boxGeometry args={[3, 0.2, 2.6]} />
      </mesh>
      <mesh material={m.fin} position={[-9.4, 0, -2.4]}>
        <boxGeometry args={[3, 0.2, 2.6]} />
      </mesh>
      {/* gôndola com faixa de luz */}
      <mesh material={m.fin} position={[0.5, -3.6, 0]}>
        <boxGeometry args={[4, 1.2, 1.6]} />
      </mesh>
      <mesh material={m.gondola} position={[0.5, -3.6, 0]}>
        <boxGeometry args={[4.1, 0.2, 1.7]} />
      </mesh>
      {/* painéis holográficos, um de cada lado */}
      <mesh material={m.panel} position={[0.5, 0.2, 3.7]}>
        <planeGeometry args={[12, 3]} />
      </mesh>
      <mesh material={m.panel} position={[0.5, 0.2, -3.7]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[12, 3]} />
      </mesh>
      {/* luzes de navegação */}
      <mesh material={m.nose} position={[11.1, 0, 0]}>
        <sphereGeometry args={[0.3, 8, 6]} />
      </mesh>
      <mesh material={m.tail} position={[-10.6, 3.7, 0]}>
        <sphereGeometry args={[0.3, 8, 6]} />
      </mesh>
      {/* holofote varrendo a cidade */}
      <group ref={beam} position={[0.5, -4.2, 0]}>
        <mesh material={m.beam} position={[0, -23, 0]}>
          <coneGeometry args={[7, 46, 24, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}
