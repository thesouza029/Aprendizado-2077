"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  NearestFilter,
  Object3D,
  SRGBColorSpace,
  type InstancedMesh,
} from "three";
import { seededRandom, type FillerBuilding } from "@/lib/city-layout";

const ROOF_PALETTE = ["#ff2fd0", "#22d3ee", "#a78bfa", "#fb7185", "#38bdf8"];
const TALL = 14; // a partir desta altura, usa a textura de janelas "alta"

/**
 * Textura de janelas gerada no navegador (nenhuma imagem para baixar):
 * fundo preto e janelinhas acesas em tons quentes e frios, algumas apagadas.
 */
function windowTexture(rows: number, seed: number): CanvasTexture {
  const cols = 6;
  const cell = 8;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const rand = seededRandom(seed);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() > 0.18) continue; // a maioria das janelas está apagada
      const warm = rand() > 0.5;
      const light = 45 + rand() * 35;
      ctx.fillStyle = warm ? `hsl(38 90% ${light}%)` : `hsl(${190 + rand() * 80} 85% ${light}%)`;
      ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 3);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  return texture;
}

/**
 * Prédios decorativos desenhados com InstancedMesh: centenas de caixas custam
 * praticamente o mesmo que uma. Um quarto deles ganha um contorno neon no telhado.
 */
export function Fillers({ fillers }: { fillers: FillerBuilding[] }) {
  const short = useMemo(() => fillers.filter((f) => f.size[1] < TALL), [fillers]);
  const tall = useMemo(() => fillers.filter((f) => f.size[1] >= TALL), [fillers]);
  const roofs = useMemo(() => fillers.filter((_, i) => i % 4 === 0), [fillers]);

  const shortTexture = useMemo(() => windowTexture(6, 11), []);
  const tallTexture = useMemo(() => windowTexture(24, 23), []);
  useEffect(
    () => () => {
      shortTexture.dispose();
      tallTexture.dispose();
    },
    [shortTexture, tallTexture],
  );

  return (
    <>
      <FillerGroup items={short} texture={shortTexture} />
      <FillerGroup items={tall} texture={tallTexture} />
      <RoofNeon items={roofs} />
    </>
  );
}

function FillerGroup({ items, texture }: { items: FillerBuilding[]; texture: CanvasTexture }) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    items.forEach((f, i) => {
      dummy.position.set(f.position[0], f.size[1] / 2, f.position[2]);
      dummy.scale.set(f.size[0], f.size[1], f.size[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#0a0d1c"
        roughness={0.55}
        metalness={0.4}
        emissive="#ffffff"
        emissiveMap={texture}
        emissiveIntensity={0.6}
      />
    </instancedMesh>
  );
}

function RoofNeon({ items }: { items: FillerBuilding[] }) {
  const ref = useRef<InstancedMesh>(null);
  const RAIL = 0.16; // espessura do contorno

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    const rand = seededRandom(5);
    let i = 0;
    for (const f of items) {
      const [x, , z] = f.position;
      const [w, h, d] = f.size;
      color.set(ROOF_PALETTE[Math.floor(rand() * ROOF_PALETTE.length)]!).multiplyScalar(2);
      // quatro trilhos finos nas bordas do telhado
      const rails: [number, number, number, number][] = [
        [x, z - d / 2, w, RAIL],
        [x, z + d / 2, w, RAIL],
        [x - w / 2, z, RAIL, d],
        [x + w / 2, z, RAIL, d],
      ];
      for (const [rx, rz, sx, sz] of rails) {
        dummy.position.set(rx, h + RAIL / 2, rz);
        dummy.scale.set(sx, RAIL, sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length * 4]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
