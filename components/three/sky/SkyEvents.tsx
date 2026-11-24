"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { registerDevTool } from "@/lib/dev-tools";
import {
  SKY_KINDS,
  SKY_TIMING,
  nextSkyDelay,
  planSkyEvent,
  type SkyEvent,
  type SkyEventKind,
} from "@/lib/sky-events";
import { Aurora } from "./Aurora";
import { Blimp } from "./Blimp";
import { CargoShip } from "./CargoShip";
import { DroneSwarm } from "./DroneSwarm";
import { Meteor, MeteorShower } from "./Meteor";

type EventProps = { event: SkyEvent; onDone: () => void };

const VIEWS: Record<SkyEventKind, ComponentType<EventProps>> = {
  meteor: Meteor,
  meteorShower: MeteorShower,
  blimp: Blimp,
  drones: DroneSwarm,
  cargo: CargoShip,
  aurora: Aurora,
};

/**
 * Agenda os eventos do céu: de tempos em tempos (20 a 45 s) sorteia um evento e um trajeto
 * que cruze o que a câmera está vendo. Cada evento se remove sozinho quando termina.
 */
export function SkyEvents() {
  const [events, setEvents] = useState<SkyEvent[]>([]);
  const active = useRef<SkyEvent[]>([]);
  const nextAt = useRef<number | null>(null);
  const previous = useRef<SkyEventKind | null>(null);
  const counter = useRef(0);
  const forced = useRef<SkyEventKind | "any" | null>(null);
  const forward = useRef(new Vector3());

  useEffect(() => {
    active.current = events;
  }, [events]);

  // em desenvolvimento: window.__devcity.sky("blimp") dispara um evento na hora (útil para testar)
  useEffect(
    () =>
      registerDevTool("sky", (kind?: SkyEventKind) => {
        forced.current = kind ?? "any";
        return kind ?? "any";
      }),
    [],
  );

  useFrame(({ clock, camera }) => {
    const now = clock.elapsedTime;
    nextAt.current ??= now + nextSkyDelay(Math.random, true);
    if (now < nextAt.current && forced.current === null) return;

    camera.getWorldDirection(forward.current);
    const perspective = camera instanceof PerspectiveCamera ? camera : null;
    const force = forced.current === "any" ? undefined : (forced.current ?? undefined);
    forced.current = null;
    const event = planSkyEvent(Math.random, {
      camera: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        forward: [forward.current.x, forward.current.y, forward.current.z],
        fov: perspective?.fov ?? 50,
        aspect: perspective?.aspect ?? 16 / 9,
      },
      previous: previous.current,
      longActive: active.current.some((e) => SKY_KINDS[e.kind].long),
      id: ++counter.current,
      force,
    });
    nextAt.current = now + (event ? nextSkyDelay(Math.random) : SKY_TIMING.retry);
    if (!event) return;
    previous.current = event.kind;
    active.current = [...active.current, event];
    setEvents(active.current);
  });

  const remove = useCallback((id: number) => setEvents((list) => list.filter((e) => e.id !== id)), []);

  return (
    <>
      {events.map((event) => {
        const View = VIEWS[event.kind];
        return <View key={event.id} event={event} onDone={() => remove(event.id)} />;
      })}
    </>
  );
}
