"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useViewMode } from "@/lib/view-mode";
import { useProgressStore } from "@/store/progress";

/** Botão do cabeçalho que alterna entre cidade 3D e modo 2D */
export function ViewModeToggle() {
  const t = useTranslations("city");
  const { mode, webgl } = useViewMode();
  const setPreference = useProgressStore((s) => s.setPreference);
  const pathname = usePathname();
  const router = useRouter();

  // antes da hidratação não sabemos o modo: reserva o espaço sem texto para não "pular"
  if (mode === "pending") return <span aria-hidden className="hidden w-24 sm:block" />;

  const is3d = mode === "3d" && pathname === "/";
  const label = is3d ? t("view2d") : t("view3d");

  return (
    <button
      type="button"
      disabled={!is3d && !webgl}
      title={!webgl ? t("webglUnavailable") : undefined}
      onClick={() => {
        if (is3d) {
          setPreference("viewMode", "2d");
          return;
        }
        setPreference("viewMode", "3d");
        if (pathname !== "/") router.push("/");
      }}
      className="rounded-lg border border-hub/40 px-3 py-1.5 text-sm font-medium text-hub hover:bg-hub/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
