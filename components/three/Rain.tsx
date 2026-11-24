"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { LineSegments } from "three";
import { seededRandom } from "@/lib/city-layout";

const AREA = 140; // largura da caixa de chuva ao redor da câmera
const HEIGHT = 90;
const LENGTH = 1.6; // comprimento de cada gota
const WIND = 0.25; // inclinação das gotas

/**
 * Chuva leve: algumas centenas de segmentos de linha numa caixa que acompanha a câmera.
 * As gotas que caem abaixo da caixa voltam para o topo (nada é criado ou destruído).
 */
export function Rain({ count }: { count: number }) {
  const ref = useRef<LineSegments>(null);

  const { positions, speeds } = useMemo(() => {
    const rand = seededRandom(99);
    const p = new Float32Array(count * 6);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * AREA;
      const y = rand() * HEIGHT;
      const z = (rand() - 0.5) * AREA;
      p.set([x, y, z, x + WIND, y - LENGTH, z], i * 6);
      s[i] = 55 + rand() * 30;
    }
    return { positions: p, speeds: s };
  }, [count]);

  useFrame(({ camera }, delta) => {
    const lines = ref.current;
    if (!lines) return;
    const attr = lines.geometry.attributes.position;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const dt = Math.min(delta, 0.05);
    const { x: cx, y: cy, z: cz } = camera.position;
    const half = AREA / 2;

    for (let i = 0; i < count; i++) {
      const o = i * 6;
      let x = arr[o]!;
      let y = arr[o + 1]! - speeds[i]! * dt;
      let z = arr[o + 2]!;
      // saiu da caixa (por baixo ou para os lados): volta no topo, perto da câmera
      if (y < cy - HEIGHT / 2 || y < 0) y += HEIGHT;
      if (x < cx - half) x += AREA;
      else if (x > cx + half) x -= AREA;
      if (z < cz - half) z += AREA;
      else if (z > cz + half) z -= AREA;
      arr[o] = x;
      arr[o + 1] = y;
      arr[o + 2] = z;
      arr[o + 3] = x + WIND;
      arr[o + 4] = y - LENGTH;
      arr[o + 5] = z;
    }
    attr.needsUpdate = true;
  });

  return (
    <lineSegments ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#9ab8ff" transparent opacity={0.24} depthWrite={false} />
    </lineSegments>
  );
}
