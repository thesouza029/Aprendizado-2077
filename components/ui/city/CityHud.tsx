"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CityLayout, Destination } from "@/lib/city-layout";
import type { CityData } from "@/lib/city-types";
import { isTypingContext } from "@/lib/city-runtime";
import { useMediaQuery } from "@/lib/hooks";
import { travelTo, useCityStore } from "@/store/city";
import { useProgressStore } from "@/store/progress";
import { CityMinimap } from "./CityMinimap";
import { CitySettings } from "./CitySettings";
import { TouchControls } from "./TouchControls";

type Props = { layout: CityLayout; data: CityData };

/**
 * HUD da cidade: modo de navegação (Viagem / Voo livre), lista de destinos (a forma
 * acessível de navegar por teclado e leitor de tela), minimapa, controles de toque,
 * dicas e anúncios de "viajando / chegou" para leitores de tela.
 */
export function CityHud({ layout, data }: Props) {
  const t = useTranslations("city");
  const activeId = useCityStore((s) => s.activeId);
  const flyingTo = useCityStore((s) => s.flyingTo);
  const navMode = useProgressStore((s) => s.preferences.navMode);
  const setPreference = useProgressStore((s) => s.setPreference);
  const coarse = useMediaQuery("(pointer: coarse)");
  const [open, setOpen] = useState(true);
  const free = navMode === "free";

  const toggleMode = () => setPreference("navMode", free ? "travel" : "free");

  // tecla F alterna os modos (fora de campos de texto e diálogos)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || e.ctrlKey || e.metaKey || e.altKey || isTypingContext()) return;
      const prefs = useProgressStore.getState();
      prefs.setPreference("navMode", prefs.preferences.navMode === "free" ? "travel" : "free");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    const list: { id: string; name: string; color: string; dest: Destination }[] = [
      { id: layout.hub.view.id, name: data.hubName, color: data.hubColor, dest: layout.hub.view },
    ];
    for (const d of layout.districts) {
      const info = data.districts.find((x) => x.id === d.id);
      if (info) list.push({ id: d.view.id, name: info.name, color: info.color, dest: d.view });
    }
    return list;
  }, [layout, data]);

  // nomes de todos os destinos (inclui prédios) para os anúncios
  const names = useMemo(() => {
    const map = new Map<string, string>([
      [layout.hub.view.id, data.hubName],
      [layout.overview.id, t("overview")],
    ]);
    for (const d of layout.districts) {
      const info = data.districts.find((x) => x.id === d.id);
      if (!info) continue;
      map.set(d.view.id, info.name);
      for (const b of d.buildings) {
        const p = info.projects.find((x) => x.id === b.projectId);
        if (p) map.set(b.view.id, p.title);
      }
    }
    return map;
  }, [layout, data, t]);

  const status = flyingTo
    ? t("flying", { name: names.get(flyingTo) ?? "" })
    : activeId
      ? t("arrived", { name: names.get(activeId) ?? "" })
      : "";

  return (
    <>
      {/* alternância de modo */}
      {/* modo de navegação e ajustes; no celular o cabeçalho quebra em mais linhas, então tudo desce um pouco */}
      <div className="fixed top-36 left-4 z-20 flex flex-col items-start gap-2 sm:top-28">
        <button
          type="button"
          onClick={toggleMode}
          aria-pressed={free}
          aria-keyshortcuts="F"
          className="panel flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-100 hover:text-white"
        >
          <span aria-hidden className={clsx("h-2 w-2 rounded-full", free ? "bg-ia" : "bg-hub")} />
          {free ? t("modeFree") : t("modeTravel")}
          <span className="text-zinc-400">· {free ? t("switchToTravel") : t("switchToFree")}</span>
          {!coarse && (
            <kbd className="rounded border border-white/20 px-1 font-mono text-[10px] text-zinc-400">F</kbd>
          )}
        </button>

        <CitySettings />
      </div>

      <nav
        aria-label={t("destinations")}
        className={clsx(
          "panel fixed bottom-4 left-4 z-20 w-60 p-3",
          activeId && "hidden sm:block", // no celular, o painel aberto ocupa a parte de baixo
          free && coarse && "hidden", // no voo livre por toque, o joystick fica neste canto
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="font-display flex w-full items-center justify-between text-sm font-semibold tracking-wide text-hub"
        >
          {t("destinations")}
          <span aria-hidden className={clsx("transition-transform", !open && "-rotate-90")}>
            ▾
          </span>
        </button>
        {open && (
          <ul className="mt-2 space-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => travelTo(item.dest)}
                  aria-label={t("travelTo", { name: item.name })}
                  aria-current={activeId === item.id ? "location" : undefined}
                  style={{ "--accent": item.color } as CSSProperties}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    activeId === item.id ? "accent-soft text-white" : "text-zinc-200 hover:bg-white/5",
                  )}
                >
                  <span aria-hidden className="accent-bar h-2 w-2 shrink-0 rounded-full" />
                  {item.name}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => travelTo(layout.overview)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              >
                {t("overview")}
              </button>
            </li>
          </ul>
        )}
      </nav>

      <CityMinimap layout={layout} data={data} compact={coarse} />

      {free && coarse && <TouchControls />}

      <p
        className={clsx(
          "pointer-events-none fixed left-1/2 z-10 max-w-md -translate-x-1/2 rounded-full bg-night-950/70 px-4 py-2 text-center text-xs text-zinc-300 backdrop-blur",
          free && coarse ? "bottom-44" : "bottom-5 hidden lg:block",
        )}
      >
        {free ? (coarse ? t("freeHelpTouch") : t("freeHelpDesktop")) : t("hint")}
      </p>

      <p role="status" className="sr-only">
        {status}
      </p>
    </>
  );
}
