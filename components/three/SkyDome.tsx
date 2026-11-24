"use client";

import { useMemo } from "react";
import { BackSide, Color } from "three";

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 glowColor;
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld).y;
    // gradiente do horizonte (roxo) para o alto (azul quase preto)
    vec3 color = mix(horizonColor, topColor, smoothstep(0.0, 0.55, h));
    // brilho magenta fino rente ao horizonte, como luz da cidade refletida nas nuvens
    color += glowColor * exp(-abs(h) * 14.0) * 0.6;
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Céu noturno em gradiente (uma esfera vista por dentro, sem iluminação nem neblina) */
export function SkyDome() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color("#03040b") },
      horizonColor: { value: new Color("#140a2e") },
      glowColor: { value: new Color("#c026d3") },
    }),
    [],
  );

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[450, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
