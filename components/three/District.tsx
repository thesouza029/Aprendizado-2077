"use client";

import { Detailed } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { AdditiveBlending, Color, DoubleSide, type Group, type MeshBasicMaterial } from "three";
import { CITY, type DistrictLayout, type Vec3 } from "@/lib/city-layout";
import type { CityDistrictData } from "@/lib/city-types";
import { useCityStore } from "@/store/city";
import { DistrictBuildings } from "./DistrictBuildings";
import { useClickable } from "./useClickable";

type Props = {
  layout: DistrictLayout;
  data: CityDistrictData;
  /** distrito "sobe do chão" ao aparecer (carregamento progressivo, só na primeira visita) */
  rise: boolean;
};

/** Além desta distância, as estantes holográficas da biblioteca somem (painéis translúcidos custam caro) */
const SHELVES_LOD = 130;
const RISE_SECONDS = 0.8;
const FLAT: Vec3 = [1, 0.001, 1];
const FULL: Vec3 = [1, 1, 1];

/** Terreno, avenida, poste do letreiro e prédios de um distrito */
export function District({ layout, data, rise }: Props) {
  const root = useRef<Group>(null);
  // decidido ao montar: re-renderizar no meio da animação não pode achatar o distrito de novo
  const [startFlat] = useState(rise);
  const riseStart = useRef<number | null>(rise ? null : -1);
  useFrame(({ clock }) => {
    if (riseStart.current === -1 || !root.current) return;
    riseStart.current ??= clock.elapsedTime;
    const t = Math.min((clock.elapsedTime - riseStart.current) / RISE_SECONDS, 1);
    root.current.scale.y = Math.max(1 - Math.pow(1 - t, 3), 0.001);
    if (t >= 1) riseStart.current = -1;
  });

  const flyTo = useCityStore((s) => s.flyTo);
  const goToDistrict = () => flyTo(layout.view);
  const landmark = useClickable(goToDistrict);

  const [fx, , fz] = layout.road.from;
  const [tx, , tz] = layout.road.to;
  const roadLength = Math.hypot(tx - fx, tz - fz);
  const roadRotation = -layout.angle;
  const lm = layout.landmark;
  // o marco (biblioteca) vira a fachada para a praça
  const facePlaza = Math.atan2(-Math.cos(layout.angle), -Math.sin(layout.angle));

  return (
    <group ref={root} scale={startFlat ? FLAT : FULL}>
      {/* avenida da praça até o distrito, com faixa neon na cor do distrito */}
      <group position={[(fx + tx) / 2, 0.05, (fz + tz) / 2]} rotation={[0, roadRotation, 0]}>
        <mesh>
          <boxGeometry args={[roadLength, 0.1, CITY.roadWidth]} />
          <meshStandardMaterial color="#0a0d1c" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[roadLength, 0.04, 0.3]} />
          <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>

      {/* terreno do distrito */}
      <group position={layout.center}>
        <mesh
          position={[0, 0.2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta <= 6) goToDistrict();
          }}
        >
          <cylinderGeometry args={[layout.radius, layout.radius, 0.4, 48]} />
          <meshStandardMaterial color="#0a0e20" emissive={data.color} emissiveIntensity={0.05} roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[layout.radius - 0.6, layout.radius, 64]} />
          <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.8} toneMapped={false} />
        </mesh>

        {/* poste do letreiro (distritos de trilha) */}
        {data.kind === "track" && (
          <mesh position={[0, layout.signPosition[1] / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, layout.signPosition[1], 8]} />
            <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        )}

        {/* biblioteca: prédio largo com estantes de luz na fachada e estantes holográficas ao redor */}
        {lm && (
          <group rotation={[0, facePlaza, 0]} {...landmark.handlers}>
            <mesh position={[0, lm.size[1] / 2, 0]}>
              <boxGeometry args={lm.size} />
              <meshStandardMaterial
                color="#140c26"
                emissive={data.color}
                emissiveIntensity={landmark.hovered ? 0.35 : 0.14}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
            {[0.2, 0.38, 0.56, 0.74].map((h) => (
              <mesh key={h} position={[0, lm.size[1] * h, lm.size[2] / 2 + 0.05]}>
                <boxGeometry args={[lm.size[0] * 0.85, 0.35, 0.1]} />
                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={2.5} toneMapped={false} />
              </mesh>
            ))}
            {/* LOD: de perto, estantes holográficas; de longe, nada (o grupo vazio é o nível "longe") */}
            <Detailed distances={[0, SHELVES_LOD]}>
              <group>
                {[-1, 1].flatMap((side) =>
                  [0, 1].map((k) => (
                    <HoloShelf
                      key={`${side}-${k}`}
                      color={data.color}
                      position={[side * (lm.size[0] / 2 + 3 + k * 4.5), 4.5, 2 - k * 4]}
                      rotationY={side * (0.35 + k * 0.25)}
                      seed={side * 3 + k}
                    />
                  )),
                )}
              </group>
              <group />
            </Detailed>
          </group>
        )}
      </group>

      {layout.buildings.length > 0 && (
        <DistrictBuildings
          buildings={layout.buildings}
          projects={data.projects}
          color={data.color}
          origin={layout.center}
        />
      )}
    </group>
  );
}

type ShelfProps = { color: string; position: [number, number, number]; rotationY: number; seed: number };

/** Estante holográfica: painel translúcido com prateleiras de luz, flutuando e piscando de leve */
function HoloShelf({ color, position, rotationY, seed }: ShelfProps) {
  const group = useRef<Group>(null);
  const panel = useRef<MeshBasicMaterial>(null);
  const bright = useMemo(() => new Color(color).multiplyScalar(2.2), [color]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    if (group.current) group.current.position.y = position[1] + Math.sin(t * 0.8) * 0.3;
    // brilho oscilando e, de vez em quando, uma piscada curta (efeito holograma)
    if (panel.current) panel.current.opacity = 0.14 + Math.sin(t * 2.3) * 0.04 + (Math.sin(t * 13) > 0.97 ? 0.12 : 0);
  });

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[4, 7]} />
        <meshBasicMaterial
          ref={panel}
          color={color}
          transparent
          opacity={0.14}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[-2.4, -0.8, 0.8, 2.4].map((y) => (
        <mesh key={y} position={[0, y, 0.02]}>
          <boxGeometry args={[3.6, 0.08, 0.05]} />
          <meshBasicMaterial color={bright} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
