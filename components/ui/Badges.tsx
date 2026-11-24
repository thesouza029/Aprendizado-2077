import clsx from "clsx";
import type { ResourceLanguage } from "@/lib/schemas";

/**
 * Indicador de idioma do recurso. Usa texto em vez de emoji de bandeira
 * porque o Windows não desenha bandeiras (mostraria só "BR"/"US").
 */
export function LangBadge({ language, label }: { language: ResourceLanguage; label: string }) {
  const pt = language === "pt-BR";
  return (
    <span
      title={label}
      className={clsx(
        "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
        pt ? "bg-emerald-400/15 text-emerald-300" : "bg-sky-400/15 text-sky-300",
      )}
    >
      <span aria-hidden>{pt ? "PT-BR" : "EN"}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
