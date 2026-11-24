"use client";

import { Detailed } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
  type Material,
} from "three";
import { neonPieces, pieceGlow, solidPieces, type BuildingPiece } from "@/lib/building-pieces";
import type { BuildingLayout, Vec3 } from "@/lib/city-layout";
import type { CityProjectData } from "@/lib/city-types";
import { stepKey } from "@/lib/progress";
import { useCityStore } from "@/store/city";
import { useProgressStore } from "@/store/progress";
import { MAX_CLICK_DRIFT, inFreeFlight } from "./useClickable";

type Props = {
  buildings: readonly BuildingLayout[];
  projects: readonly CityProjectData[];
  color: string;
  /** centro do distrito: as peças ficam relativas a ele e o LOD mede a distância a partir dele */
  origin: Vec3;
};

/** Além desta distância da câmera, os andares de vidro viram uma torre só (de longe não se vê a diferença) */
const LOD_DISTANCE = 130;
const GLASS = "#141c36";
const OFF = new Color("#1a2038");

/**
 * Vidro escuro cujo brilho (emissive) vem da cor de cada instância: assim um único
 * InstancedMesh desenha andares acesos e apagados de prédios diferentes.
 */
function createGlassMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: GLASS, metalness: 0.35, roughness: 0.4 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <color_fragment>", "")
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance = vColor.rgb;\n#endif",
      );
  };
  material.customProgramCacheKey = () => "devcity-glass-instance-emissive";
  return material;
}

/**
 * Os prédios de projeto de um distrito, montados com peças instanciadas:
 * vidro (com LOD: por andar de perto, torre inteira de longe) + neon (faixas e letreiros).
 */
export function DistrictBuildings({ buildings, projects, color, origin }: Props) {
  const completed = useProgressStore((s) => s.completedSteps);
  const flyTo = useCityStore((s) => s.flyTo);
  const setHovered = useCityStore((s) => s.setHovered);
  const ids = useMemo(() => buildings.map((b) => b.view.id), [buildings]);
  // prédios realçados (mouse em cima ou painel aberto), como texto estável para não re-renderizar à toa
  const highlighted = useCityStore((s) =>
    [s.hoveredId, s.activeId].filter((id): id is string => id !== null && ids.includes(id)).join("|"),
  );
  const hoveredHere = useCityStore((s) => s.hoveredId !== null && ids.includes(s.hoveredId));

  const glass = useMemo(createGlassMaterial, []);
  const neon = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(
    () => () => {
      glass.dispose();
      neon.dispose();
    },
    [glass, neon],
  );

  const near = useMemo(() => solidPieces(buildings, origin, "high"), [buildings, origin]);
  const far = useMemo(() => solidPieces(buildings, origin, "low"), [buildings, origin]);
  const lights = useMemo(() => neonPieces(buildings, origin), [buildings, origin]);

  const floorsLit = useMemo(
    () =>
      buildings.map((b) => {
        const project = projects.find((p) => p.id === b.projectId);
        return project ? project.steps.map((s) => stepKey(project.id, s.id) in completed) : [];
      }),
    [buildings, projects, completed],
  );

  // cor (e brilho) de cada peça, recalculada só quando o progresso ou o realce mudam
  const colorOf = useMemo(() => {
    const accent = new Color(color);
    const active = new Set(highlighted ? highlighted.split("|") : []);
    return (piece: BuildingPiece, out: Color) => {
      const glow = pieceGlow(piece, floorsLit[piece.building] ?? [], active.has(ids[piece.building] ?? ""));
      out.copy(accent).multiplyScalar(glow.accent);
      if (glow.base) out.add(OFF);
      return out;
    };
  }, [color, highlighted, floorsLit, ids]);

  useEffect(() => {
    if (!hoveredHere) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredHere]);

  const buildingAt = (pieces: readonly BuildingPiece[], instanceId: number | undefined) =>
    instanceId === undefined ? undefined : buildings[pieces[instanceId]?.building ?? -1];

  const handlersFor = (pieces: readonly BuildingPiece[]) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const b = buildingAt(pieces, e.instanceId);
      if (b && !inFreeFlight()) setHovered(b.view.id);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      const b = buildingAt(pieces, e.instanceId);
      if (b && useCityStore.getState().hoveredId === b.view.id) setHovered(null);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (inFreeFlight() || e.delta > MAX_CLICK_DRIFT) return;
      const b = buildingAt(pieces, e.instanceId);
      if (b) flyTo(b.view);
    },
  });

  return (
    <group position={origin}>
      <Detailed distances={[0, LOD_DISTANCE]} hysteresis={0.05}>
        <PieceMesh pieces={near} material={glass} colorOf={colorOf} {...handlersFor(near)} />
        <PieceMesh pieces={far} material={glass} colorOf={colorOf} {...handlersFor(far)} />
      </Detailed>
      {/* o neon não recebe cliques: o vidro por baixo já cobre o prédio inteiro */}
      <PieceMesh pieces={lights} material={neon} colorOf={colorOf} raycast={() => null} />
    </group>
  );
}

type PieceMeshProps = {
  pieces: readonly BuildingPiece[];
  material: Material;
  colorOf: (piece: BuildingPiece, out: Color) => Color;
  raycast?: () => null;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
};

/** Um InstancedMesh de cubos de lado 1, cada instância posicionada e esticada conforme a peça */
function PieceMesh({ pieces, material, colorOf, ...rest }: PieceMeshProps) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    pieces.forEach((piece, i) => {
      matrix.compose(position.set(...piece.position), rotation, scale.set(...piece.scale));
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // esfera envolvente de todas as instâncias: usada no recorte da câmera e nos cliques
    mesh.computeBoundingSphere();
  }, [pieces]);

  // roda antes do primeiro quadro, então o shader já nasce sabendo que há cor por instância
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new Color();
    pieces.forEach((piece, i) => mesh.setColorAt(i, colorOf(piece, color)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pieces, colorOf]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]} material={material} {...rest}>
      <boxGeometry />
    </instancedMesh>
  );
}
