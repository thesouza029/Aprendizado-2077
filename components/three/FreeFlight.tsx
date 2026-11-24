"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Euler, Vector3 } from "three";
import { resolveMovement, type CollisionBox, type FlightLimits } from "@/lib/city-layout";
import { flightInput, isTypingContext } from "@/lib/city-runtime";
import { useCityStore } from "@/store/city";
import { useProgressStore } from "@/store/progress";

const SPEED = 30; // unidades por segundo
const MOUSE_LOOK = 0.0022; // radianos por pixel
const TOUCH_LOOK = 0.005;
const MAX_PITCH = 1.45; // ~83°, para não dar cambalhota

type Action = "forward" | "back" | "left" | "right" | "up" | "down";

const KEYMAP: Record<string, Action> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "up",
  ShiftLeft: "down",
  ShiftRight: "down",
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type Props = { boxes: CollisionBox[]; limits: FlightLimits };

/**
 * Voo livre: WASD/setas movem, mouse olha (pointer lock), Espaço sobe e Shift desce.
 * No celular, o joystick e os botões de toque escrevem em `flightInput`, e arrastar a cena olha.
 * A colisão com prédios e os limites da cidade vêm de `resolveMovement` (lógica pura, testada).
 */
export function FreeFlight({ boxes, limits }: Props) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const euler = useRef(new Euler(0, 0, 0, "YXZ"));
  const pressed = useRef(new Set<Action>());

  useEffect(() => {
    const look = euler.current;
    const keys = pressed.current;
    look.setFromQuaternion(camera.quaternion, "YXZ");
    look.z = 0;

    const canvas = gl.domElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const rotate = (dx: number, dy: number) => {
      look.y -= dx;
      look.x = clamp(look.x - dy, -MAX_PITCH, MAX_PITCH);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (!action || e.ctrlKey || e.metaKey || e.altKey || isTypingContext()) return;
      e.preventDefault(); // Espaço e setas não rolam a página
      keys.add(action);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (action) keys.delete(action);
    };
    const onBlur = () => keys.clear();

    // computador: clicar na cena captura o mouse; Esc solta (comportamento do navegador)
    const onClick = () => {
      if (coarse || document.pointerLockElement === canvas) return;
      void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) rotate(e.movementX * MOUSE_LOOK, e.movementY * MOUSE_LOOK);
    };

    // toque: arrastar a cena para olhar em volta
    let touch: { id: number; x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") touch = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!touch || e.pointerId !== touch.id) return;
      flightInput.lookX += e.clientX - touch.x;
      flightInput.lookY += e.clientY - touch.y;
      touch.x = e.clientX;
      touch.y = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (touch && e.pointerId === touch.id) touch = null;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      keys.clear();
      Object.assign(flightInput, { forward: 0, right: 0, up: 0, lookX: 0, lookY: 0 });

      // ao voltar para o modo Viagem, a câmera orbital continua olhando para onde estávamos olhando
      const dir = new Vector3();
      camera.getWorldDirection(dir);
      const target = camera.position.clone().addScaledVector(dir, 30);
      useCityStore.getState().setResumeTarget([target.x, Math.max(0, target.y), target.z]);
      useProgressStore.getState().setLastPosition([camera.position.x, camera.position.y, camera.position.z]);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // evita "teleporte" depois de uma aba em segundo plano
    const look = euler.current;

    if (flightInput.lookX || flightInput.lookY) {
      look.y -= flightInput.lookX * TOUCH_LOOK;
      look.x = clamp(look.x - flightInput.lookY * TOUCH_LOOK, -MAX_PITCH, MAX_PITCH);
      flightInput.lookX = 0;
      flightInput.lookY = 0;
    }
    camera.quaternion.setFromEuler(look);

    const k = pressed.current;
    const f = (k.has("forward") ? 1 : 0) - (k.has("back") ? 1 : 0) + flightInput.forward;
    const r = (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0) + flightInput.right;
    const u = (k.has("up") ? 1 : 0) - (k.has("down") ? 1 : 0) + flightInput.up;
    if (!f && !r && !u) return;

    // anda no plano horizontal na direção em que se olha; subir/descer é separado
    const yaw = look.y;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const step = SPEED * dt;
    const next = resolveMovement(
      [camera.position.x, camera.position.y, camera.position.z],
      [(fx * f + rx * r) * step, u * step * 0.7, (fz * f + rz * r) * step],
      boxes,
      limits,
    );
    camera.position.set(next[0], next[1], next[2]);
  });

  return null;
}
