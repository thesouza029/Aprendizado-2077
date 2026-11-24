"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { flightInput } from "@/lib/city-runtime";

const RADIUS = 48; // quanto o pino do joystick pode se afastar do centro (px)

/** Mantém o toque "preso" ao controle mesmo se o dedo sair dele; alguns navegadores recusam e tudo bem */
function capture(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // sem captura o controle continua funcionando enquanto o dedo estiver em cima dele
  }
}

/** Joystick virtual + botões de subir/descer para o voo livre no celular */
export function TouchControls() {
  const t = useTranslations("city");
  const base = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const rect = base.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx *= RADIUS / len;
      dy *= RADIUS / len;
    }
    setKnob({ x: dx, y: dy });
    flightInput.right = dx / RADIUS;
    flightInput.forward = -dy / RADIUS;
  };

  const release = () => {
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    flightInput.right = 0;
    flightInput.forward = 0;
  };

  useEffect(
    () => () => {
      flightInput.right = 0;
      flightInput.forward = 0;
      flightInput.up = 0;
    },
    [],
  );

  return (
    <>
      <div
        ref={base}
        role="img"
        aria-label={t("joystick")}
        className="fixed bottom-6 left-6 z-20 h-32 w-32 touch-none rounded-full border border-white/20 bg-night-950/60 backdrop-blur select-none"
        onPointerDown={(e) => {
          activePointer.current = e.pointerId;
          capture(e.currentTarget, e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => {
          if (activePointer.current === e.pointerId) move(e);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          className="absolute top-1/2 left-1/2 h-12 w-12 rounded-full bg-hub/70 shadow-[0_0_20px_var(--color-hub)]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>

      <div className="fixed right-6 bottom-6 z-20 flex flex-col gap-3">
        <HoldButton label={t("up")} onHold={(on) => (flightInput.up = on ? 1 : 0)}>
          ▲
        </HoldButton>
        <HoldButton label={t("down")} onHold={(on) => (flightInput.up = on ? -1 : 0)}>
          ▼
        </HoldButton>
      </div>
    </>
  );
}

function HoldButton({
  label,
  onHold,
  children,
}: {
  label: string;
  onHold: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="h-14 w-14 touch-none rounded-full border border-white/20 bg-night-950/60 text-xl text-hub backdrop-blur select-none active:bg-hub/20"
      onPointerDown={(e) => {
        capture(e.currentTarget, e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
