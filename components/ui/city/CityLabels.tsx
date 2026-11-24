"use client";

import clsx from "clsx";
import { useMemo, type CSSProperties } from "react";
import { labelAnchors, type CityLayout, type Destination } from "@/lib/city-layout";
import type { CityData } from "@/lib/city-types";
import { registerLabel } from "@/lib/city-runtime";
import { travelTo, useCityStore } from "@/store/city";

type Props = { layout: CityLayout; data: CityData };

type Label = {
  id: string;
  kind: "hub" | "district" | "project";
  text: string;
  color: string;
  dest: Destination;
};

/**
 * Letreiros neon da cidade (DOM comum, posicionados a cada quadro pelo LabelProjector).
 * Trocam de idioma junto com a interface. Ficam fora da ordem de Tab:
 * a navegação por teclado usa a lista de destinos do HUD.
 */
export function CityLabels({ layout, data }: Props) {
  const hoveredId = useCityStore((s) => s.hoveredId);
  const activeId = useCityStore((s) => s.activeId);

  const labels = useMemo(() => {
    const out: Label[] = [];
    for (const anchor of labelAnchors(layout)) {
      if (anchor.kind === "hub") {
        out.push({ ...anchor, text: data.hubName, color: data.hubColor, dest: layout.hub.view });
        continue;
      }
      for (const d of layout.districts) {
        const info = data.districts.find((x) => x.id === d.id);
        if (!info) continue;
        if (anchor.id === d.view.id) {
          out.push({ ...anchor, text: info.name, color: info.color, dest: d.view });
        }
        const building = d.buildings.find((b) => b.view.id === anchor.id);
        const project = building && info.projects.find((p) => p.id === building.projectId);
        if (building && project) {
          out.push({ ...anchor, text: project.title, color: info.color, dest: building.view });
        }
      }
    }
    return out;
  }, [layout, data]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {labels.map((l) => {
        // letreiros de prédio só aparecem com o mouse em cima ou com o painel aberto
        const hidden = l.kind === "project" && hoveredId !== l.id && activeId !== l.id;
        return (
          <button
            key={l.id}
            ref={(el) => registerLabel(l.id, el)}
            type="button"
            tabIndex={-1}
            onClick={() => travelTo(l.dest)}
            style={{ "--accent": l.color, visibility: "hidden" } as CSSProperties}
            className={clsx(
              "pointer-events-auto absolute top-0 left-0 cursor-pointer whitespace-nowrap select-none will-change-transform",
              hidden && "hidden",
              l.kind === "project"
                ? "font-display rounded bg-night-950/85 px-2 py-0.5 text-xs text-zinc-100"
                : "font-display accent-text accent-border neon-text rounded-md border bg-night-950/70 px-3 py-1 text-sm font-semibold tracking-wide backdrop-blur-sm hover:bg-night-900",
            )}
          >
            {l.text}
          </button>
        );
      })}
    </div>
  );
}
