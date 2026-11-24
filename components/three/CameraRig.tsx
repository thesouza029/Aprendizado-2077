"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Vector3 } from "three";
import {
  easeInOutCubic,
  flightControlPoint,
  flightDuration,
  quadraticBezier,
  type Destination,
  type Vec3,
} from "@/lib/city-layout";
import { useCityStore } from "@/store/city";
import { useProgressStore } from "@/store/progress";

/** O que usamos do OrbitControls (evita depender dos tipos internos do three-stdlib) */
type ControlsLike = { target: Vector3; enabled: boolean; update: () => void };

type Flight = {
  id: string;
  from: Vec3;
  control: Vec3;
  to: Vec3;
  fromTarget: Vec3;
  toTarget: Vec3;
  start: number;
  durationMs: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Câmera do modo Viagem: OrbitControls para olhar em volta quando parada
 * e voo automático em curva bezier quando um destino é escolhido.
 */
export function CameraRig({ initialTarget }: { initialTarget: Vec3 }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const flight = useRef<Flight | null>(null);
  /** último pedido de voo já atendido (para não repetir) */
  const handled = useRef<Destination | null>(null);
  const arrive = useCityStore((s) => s.arrive);
  const setLastPosition = useProgressStore((s) => s.setLastPosition);

  // alvo inicial: para onde se olhava no voo livre, ou o alvo padrão
  useEffect(() => {
    if (!controls) return;
    const { resumeTarget, setResumeTarget } = useCityStore.getState();
    const t = resumeTarget ?? initialTarget;
    controls.target.set(t[0], t[1], t[2]);
    controls.update();
    setResumeTarget(null);
    // initialTarget só importa na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  useFrame(() => {
    // novo pedido de voo? (conferido a cada quadro: funciona mesmo se o pedido veio
    // antes desta câmera existir, por exemplo ao sair do voo livre)
    const request = useCityStore.getState().flight;
    if (request && request !== handled.current && controls) {
      handled.current = request;
      const from: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
      flight.current = {
        id: request.id,
        from,
        to: request.position,
        control: flightControlPoint(from, request.position),
        fromTarget: [controls.target.x, controls.target.y, controls.target.z],
        toTarget: request.target,
        start: performance.now(),
        durationMs: flightDuration(from, request.position) * 1000,
      };
      controls.enabled = false;
    }

    const f = flight.current;
    if (!f) return;
    const t = Math.min(1, (performance.now() - f.start) / f.durationMs);
    const e = easeInOutCubic(t);
    const p = quadraticBezier(f.from, f.control, f.to, e);
    camera.position.set(p[0], p[1], p[2]);
    const tx = lerp(f.fromTarget[0], f.toTarget[0], e);
    const ty = lerp(f.fromTarget[1], f.toTarget[1], e);
    const tz = lerp(f.fromTarget[2], f.toTarget[2], e);
    camera.lookAt(tx, ty, tz);
    if (controls) controls.target.set(tx, ty, tz);

    if (t >= 1) {
      flight.current = null;
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
      setLastPosition(f.to);
      arrive(f.id);
    }
  });

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={12}
      maxDistance={280}
      maxPolarAngle={Math.PI * 0.47}
    />
  );
}
