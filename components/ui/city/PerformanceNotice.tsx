"use client";

import { useTranslations } from "next-intl";
import { usePerformanceStore } from "@/store/performance";
import { useProgressStore } from "@/store/progress";

/**
 * Aviso para quem escolheu a cidade 3D mas o aparelho não está dando conta:
 * a troca para o 2D não é automática nesse caso, então oferecemos o botão.
 */
export function PerformanceNotice() {
  const t = useTranslations("city");
  const struggling = usePerformanceStore((s) => s.struggling);
  const setStruggling = usePerformanceStore((s) => s.setStruggling);
  const setPreference = useProgressStore((s) => s.setPreference);

  if (!struggling) return null;

  return (
    <div
      role="status"
      className="panel fixed inset-x-4 bottom-24 z-30 flex flex-wrap items-center gap-3 p-3 text-sm text-zinc-200 sm:inset-x-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
    >
      <span className="flex-1">{t("slowNotice")}</span>
      <button
        type="button"
        onClick={() => {
          setStruggling(false);
          setPreference("viewMode", "2d");
        }}
        className="rounded-lg border border-hub/40 px-3 py-1 font-medium text-hub hover:bg-hub/10"
      >
        {t("use2d")}
      </button>
      <button
        type="button"
        onClick={() => setStruggling(false)}
        className="rounded-lg px-2 py-1 text-zinc-400 hover:text-zinc-100"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}
