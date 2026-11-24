"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D, type InstancedMesh } from "three";
import { buildTraffic, type CityLayout } from "@/lib/city-layout";

/** Cores dos carros, multiplicadas acima de 1 para o bloom pegar (luz neon) */
const PALETTE = ["#ff2fd0", "#22d3ee", "#facc15", "#a78bfa", "#fb7185"];
const GLOW = 2.2;

/**
 * Carros voadores em loop ao fundo: um único InstancedMesh com material sem iluminação.
 * Cada carro anda numa órbita circular acima dos prédios, com uma leve ondulação.
 */
export function FlyingTraffic({ layout, count }: { layout: CityLayout; count: number }) {
  const ref = useRef<InstancedMesh>(null);
  const lanes = useMemo(() => buildTraffic(count, layout), [count, layout]);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new Color();
    lanes.forEach((lane, i) => {
      color.set(PALETTE[lane.colorIndex] ?? PALETTE[0]!).multiplyScalar(GLOW);
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lanes]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    lanes.forEach((lane, i) => {
      const a = lane.phase + t * lane.speed * lane.direction;
      dummy.position.set(Math.cos(a) * lane.radius, lane.height + Math.sin(t * 0.6 + lane.phase) * 1.2, Math.sin(a) * lane.radius);
      // aponta o carro na direção do movimento (tangente da órbita)
      dummy.rotation.set(0, -a - (lane.direction * Math.PI) / 2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lanes.length]} frustumCulled={false}>
      <boxGeometry args={[1.8, 0.35, 0.6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
