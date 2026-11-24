"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, ShaderMaterial } from "three";
import { fadeInOut, type SkyEvent } from "@/lib/sky-events";
import { useEventClock } from "./useEventClock";

const HEIGHT = 70;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // a cortina ondula mais em cima do que embaixo
    p.y += sin(uv.x * 14.0 + uTime * 0.6) * 4.0 * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  varying vec2 vUv;
  void main() {
    // faixas verticais que deslizam devagar, como uma aurora
    float bands = 0.5 + 0.5 * sin(vUv.x * 48.0 + uTime * 0.9 + sin(vUv.x * 13.0 - uTime * 0.4) * 2.5);
    bands = pow(bands, 3.0);
    float vertical = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
    float edges = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
    vec3 color = mix(uLow, uHigh, clamp(smoothstep(0.2, 1.0, vUv.y) + 0.2 * sin(vUv.x * 6.0 + uTime * 0.3), 0.0, 1.0));
    float alpha = (0.25 + 0.75 * bands) * vertical * edges * uFade * 0.55;
    gl_FragColor = vec4(color * 1.6, alpha);
  }
`;

type Props = { event: SkyEvent; onDone: () => void };

/** Aurora neon: uma cortina de luz em arco ao redor da câmera, que surge, ondula e some */
export function Aurora({ event, onDone }: Props) {
  const { geometry, pivot } = useMemo(() => {
    const pivot = event.pivot ?? ([0, event.start[1], 0] as const);
    const [px, , pz] = pivot;
    const [sx, , sz] = event.start;
    const [ex, , ez] = event.end;
    const radius = Math.hypot(sx - px, sz - pz);
    // no CylinderGeometry, x = r·sen(θ) e z = r·cos(θ)
    const a = Math.atan2(sx - px, sz - pz);
    let span = Math.atan2(ex - px, ez - pz) - a;
    while (span <= -Math.PI) span += Math.PI * 2;
    while (span > Math.PI) span -= Math.PI * 2;
    const thetaStart = span >= 0 ? a : a + span;
    const geometry = new CylinderGeometry(radius, radius, HEIGHT, 96, 8, true, thetaStart, Math.abs(span));
    return { geometry, pivot: [...pivot] as [number, number, number] };
  }, [event]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFade: { value: 0 },
          uLow: { value: new Color("#2dd4bf") },
          uHigh: { value: new Color("#c026d3") },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEventClock(event.duration, onDone, (p, t) => {
    material.uniforms.uTime!.value = t;
    material.uniforms.uFade!.value = fadeInOut(p, 0.22);
  });

  return <mesh geometry={geometry} material={material} position={pivot} frustumCulled={false} />;
}
