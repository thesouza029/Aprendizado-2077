"use client";

import { useTranslations } from "next-intl";

/** Tela de carregamento temática enquanto o código 3D é baixado */
export function CityLoading() {
  const t = useTranslations("city");
  return (
    <div role="status" className="fixed inset-0 z-0 grid place-items-center bg-night-950">
      <div className="text-center">
        <p className="font-display neon-text animate-pulse text-3xl font-bold tracking-[0.3em] text-hub motion-reduce:animate-none">
          DEV<span className="text-library">CITY</span>
        </p>
        <p className="mt-4 font-mono text-sm text-zinc-400">{t("loading")}</p>
      </div>
    </div>
  );
}
