"use client";

import type { CityLayout } from "@/lib/city-layout";
import { useCityStore } from "@/store/city";
import { useClickable } from "./useClickable";

type Props = { layout: CityLayout; color: string };

/** Praça central com a Torre Central (o hub): vidro claro, faixas neon verticais e farol */
export function Plaza({ layout, color }: Props) {
  const flyTo = useCityStore((s) => s.flyTo);
  const isActive = useCityStore((s) => s.activeId === layout.hub.view.id);
  const tower = useClickable(() => flyTo(layout.hub.view));
  const { height, radius } = layout.hub;
  const highlight = tower.hovered || isActive;

  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[layout.plazaRadius, layout.plazaRadius, 0.3, 64]} />
        <meshStandardMaterial color="#0b0f22" emissive={color} emissiveIntensity={0.04} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[layout.plazaRadius - 0.5, layout.plazaRadius, 96]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      <group {...tower.handlers}>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[radius * 0.6, radius, height, 24]} />
          <meshStandardMaterial
            color="#9fd8ee"
            emissive={color}
            emissiveIntensity={highlight ? 0.45 : 0.22}
            roughness={0.15}
            metalness={0.8}
          />
        </mesh>
        {/* quatro faixas neon subindo pela torre */}
        {[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2 + Math.PI / 4;
          const r = radius * 0.8;
          return (
            <mesh key={k} position={[Math.cos(a) * r, height / 2, Math.sin(a) * r]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.25, height * 0.96, 0.25]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
            </mesh>
          );
        })}
        {/* farol no topo */}
        <mesh position={[0, height + 1.5, 0]}>
          <sphereGeometry args={[1.6, 24, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
