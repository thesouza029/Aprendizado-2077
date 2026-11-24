"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useMediaQuery } from "@/lib/hooks";
import type { Preferences } from "@/lib/progress";
import { useGraphicsTier } from "@/store/performance";
import { useProgressStore } from "@/store/progress";

/**
 * Ajustes da cidade: chuva, som, eventos no céu e qualidade gráfica.
 * Aberto por padrão em telas largas; no celular começa recolhido para não cobrir a cidade.
 */
export function CitySettings() {
  const t = useTranslations("city");
  const rain = useProgressStore((s) => s.preferences.rain);
  const sound = useProgressStore((s) => s.preferences.sound);
  const skyEvents = useProgressStore((s) => s.preferences.skyEvents);
  const graphics = useProgressStore((s) => s.preferences.graphics);
  const setPreference = useProgressStore((s) => s.setPreference);
  const tier = useGraphicsTier();
  const wide = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(wide);
  const panelId = useId();

  const tierName = { high: t("tierHigh"), medium: t("tierMedium"), low: t("tierLow") }[tier];

  return (
    <div className="panel p-1 text-xs">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 font-medium text-zinc-200 hover:text-white"
      >
        {t("settings")}
        <span aria-hidden className={clsx("transition-transform", !open && "-rotate-90")}>
          ▾
        </span>
      </button>
      {open && (
        <div id={panelId} role="group" aria-label={t("settings")} className="mt-1 flex max-w-[16rem] flex-wrap items-center gap-1 sm:max-w-none">
          <SettingToggle pressed={rain} onClick={() => setPreference("rain", !rain)} label={t("settingRain")} />
          <SettingToggle pressed={sound} onClick={() => setPreference("sound", !sound)} label={t("settingSound")} />
          <SettingToggle
            pressed={skyEvents}
            onClick={() => setPreference("skyEvents", !skyEvents)}
            label={t("settingSky")}
          />
          <label className="flex items-center gap-1.5 rounded-md px-2 py-1 text-zinc-300">
            {t("settingGraphics")}
            <select
              value={graphics}
              onChange={(e) => setPreference("graphics", e.target.value as Preferences["graphics"])}
              className="rounded-md border border-white/15 bg-night-900 px-1.5 py-0.5 text-xs text-zinc-100"
            >
              <option value="auto">{t("graphicsAuto", { tier: tierName })}</option>
              <option value="high">{t("graphicsHigh")}</option>
              <option value="low">{t("graphicsLow")}</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function SettingToggle({ pressed, onClick, label }: { pressed: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        "rounded-md px-2 py-1 font-medium transition-colors",
        pressed ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-100",
      )}
    >
      <span aria-hidden className={clsx("mr-1", pressed ? "text-hub" : "text-zinc-600")}>
        ●
      </span>
      {label}
    </button>
  );
}
