"use client";

import { Grid, MeshReflectorMaterial } from "@react-three/drei";

type Props = {
  size: number;
  /** resolução do reflexo; 0 desliga (o reflexo exige desenhar a cena duas vezes) */
  reflector: number;
};

/**
 * Chão molhado: reflete os neons (MeshReflectorMaterial) com borrão, como asfalto na chuva.
 * No nível de gráficos médio o reflexo tem metade da resolução; no leve vira um chão escuro comum.
 */
export function WetGround({ size, reflector }: Props) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        {reflector === 0 ? (
          <meshStandardMaterial color="#05060d" roughness={0.9} />
        ) : (
          <MeshReflectorMaterial
            key={reflector}
            blur={[300, 90]}
            resolution={reflector}
            mixBlur={1}
            mixStrength={22}
            mirror={0.6}
            roughness={0.85}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#05060d"
            metalness={0.6}
          />
        )}
      </mesh>
      <Grid
        position={[0, 0.03, 0]}
        args={[size, size]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#141a36"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#1e2f55"
        fadeDistance={260}
        fadeStrength={1.5}
        infiniteGrid
      />
    </>
  );
}
