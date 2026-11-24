"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";
import { CITY, type CityLayout } from "@/lib/city-layout";
import type { CityData } from "@/lib/city-types";
import { cameraPose } from "@/lib/city-runtime";
import { travelTo, useCityStore } from "@/store/city";

type Props = { layout: CityLayout; data: CityData; compact: boolean };

/**
 * Minimapa: a cidade vista de cima, com a câmera como uma seta.
 * Clicar num distrito viaja até ele. Para teclado e leitores de tela,
 * a lista "Destinos" faz o mesmo papel, por isso o mapa é decorativo (aria-hidden).
 */
export function CityMinimap({ layout, data, compact }: Props) {
  const marker = useRef<SVGGElement>(null);
  const panelOpen = useCityStore((s) => s.activeId !== null);
  const R = layout.cityRadius + 8;

  // a seta acompanha a câmera sem re-renderizar o React
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const deg = (Math.atan2(cameraPose.dirZ, cameraPose.dirX) * 180) / Math.PI;
      marker.current?.setAttribute(
        "transform",
        `translate(${cameraPose.x.toFixed(1)} ${cameraPose.z.toFixed(1)}) rotate(${deg.toFixed(1)})`,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // a parte fixa do mapa só é montada uma vez
  const staticMap = useMemo(
    () => (
      <>
        <circle r={R - 1} fill="#070a14" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        {layout.fillers.map((f, i) => (
          <rect
            key={i}
            x={f.position[0] - f.size[0] / 2}
            y={f.position[2] - f.size[2] / 2}
            width={f.size[0]}
            height={f.size[2]}
            fill="#1b2140"
          />
        ))}
        <circle r={layout.plazaRadius} fill={data.hubColor} fillOpacity={0.2} stroke={data.hubColor} strokeWidth={1.5} />
        {layout.districts.map((d) => {
          const info = data.districts.find((x) => x.id === d.id);
          if (!info) return null;
          return (
            <g key={d.id}>
              <line
                x1={d.road.from[0]}
                y1={d.road.from[2]}
                x2={d.road.to[0]}
                y2={d.road.to[2]}
                stroke={info.color}
                strokeOpacity={0.5}
                strokeWidth={2}
              />
              <circle
                cx={d.center[0]}
                cy={d.center[2]}
                r={d.radius}
                fill={info.color}
                fillOpacity={0.22}
                stroke={info.color}
                strokeWidth={2}
                className="cursor-pointer transition-opacity hover:opacity-70"
                onClick={() => travelTo(d.view)}
              >
                <title>{info.name}</title>
              </circle>
              {d.buildings.map((b) => (
                <rect
                  key={b.projectId}
                  x={b.position[0] - CITY.buildingSize / 2}
                  y={b.position[2] - CITY.buildingSize / 2}
                  width={CITY.buildingSize}
                  height={CITY.buildingSize}
                  fill={info.color}
                  className="pointer-events-none"
                />
              ))}
            </g>
          );
        })}
      </>
    ),
    [layout, data, R],
  );

  return (
    <div
      aria-hidden
      className={clsx(
        "panel fixed z-20",
        compact ? "top-36 right-3 p-1 sm:top-28" : "bottom-4 p-2",
        !compact && (panelOpen ? "right-[calc(26rem+2rem)] hidden lg:block" : "right-4 hidden sm:block"),
      )}
    >
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className={compact ? "h-24 w-24" : "h-40 w-40"}>
        {staticMap}
        <g ref={marker}>
          <path d="M 10 0 L -6 -7 L -2 0 L -6 7 Z" fill="#ffffff" stroke="#05060d" strokeWidth={1.5} />
        </g>
      </svg>
    </div>
  );
}
