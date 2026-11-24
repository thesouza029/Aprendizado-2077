"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { CityExperienceProps } from "@/components/three/CityExperience";
import { useViewMode } from "@/lib/view-mode";
import { usePerformanceStore } from "@/store/performance";
import { useProgressStore } from "@/store/progress";
import { CityLoading } from "./CityLoading";

// three.js só existe no navegador: a cidade nunca é renderizada no servidor
const CityExperience = dynamic(() => import("@/components/three/CityExperience"), {
  ssr: false,
  loading: () => <CityLoading />,
});

type Props = { city: CityExperienceProps; children: ReactNode };

/**
 * Torre Central: mostra a cidade 3D ou o hub 2D (children, já renderizado no servidor).
 * Antes da hidratação, sempre o 2D: funciona sem JavaScript e é o que buscadores leem.
 */
export function HubSwitch({ city, children }: Props) {
  const { mode, reason } = useViewMode();
  const t = useTranslations("city");
  const setPreference = useProgressStore((s) => s.setPreference);
  const clearFallback = usePerformanceStore((s) => s.clearFallback);

  if (mode === "3d") return <CityExperience {...city} />;

  return (
    <>
      {(reason === "no-webgl" || reason === "reduced-motion") && (
        <p role="note" className="mx-auto mt-6 max-w-6xl px-4 text-sm text-zinc-400">
          {reason === "no-webgl" ? t("webglUnavailable") : t("reducedMotionNotice")}
        </p>
      )}
      {reason === "performance" && (
        <div role="note" className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center gap-3 px-4 text-sm text-zinc-300">
          <span>{t("performanceNotice")}</span>
          <button
            type="button"
            onClick={() => {
              clearFallback();
              setPreference("viewMode", "3d");
            }}
            className="rounded-lg border border-hub/40 px-3 py-1 font-medium text-hub hover:bg-hub/10"
          >
            {t("retry3d")}
          </button>
        </div>
      )}
      {children}
    </>
  );
}
