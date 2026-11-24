"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D, type Group, type InstancedMesh } from "three";
import { droneOffset, fadeInOut, type SkyEvent } from "@/lib/sky-events";
import { lightMaterial } from "./materials";
import { headingOf, useEventClock } from "./useEventClock";

const COUNT = 30;
const PALETTE = ["#22d3ee", "#ff2fd0", "#facc15"];
const GLOW = 3;

type Props = { event: SkyEvent; onDone: () => void };

/**
 * Show de drones: uma revoada em V que, no meio do caminho, vira um anel
 * e depois um coração antes de voltar ao V. Um InstancedMesh só para todos.
 */
export function DroneSwarm({ event, onDone }: Props) {
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(lightMaterial, []);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const color = new Color();
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, color.set(PALETTE[i % PALETTE.length]!).multiplyScalar(GLOW));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  const yaw = headingOf(event.start, event.end);
  const [sx, sy, sz] = event.start;
  const [ex, ey, ez] = event.end;

  useEventClock(event.duration, onDone, (p, t) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    g.position.set(sx + (ex - sx) * p, sy + (ey - sy) * p, sz + (ez - sz) * p);
    material.opacity = fadeInOut(p, 0.06);
    for (let i = 0; i < COUNT; i++) {
      const [x, y, z] = droneOffset(i, COUNT, p);
      dummy.position.set(x, y + Math.sin(t * 2 + i) * 0.3, z);
      dummy.rotation.y = t * 2 + i;
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={event.start} rotation={[0, yaw, 0]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} material={material} frustumCulled={false}>
        <octahedronGeometry args={[0.5, 0]} />
      </instancedMesh>
    </group>
  );
}
