"use client";

import { useTranslations } from "next-intl";
import type { ProjectSummary } from "@/lib/content";
import { useHydrated } from "@/lib/hooks";
import { aggregateProgress } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";

type Props = {
  projects: ProjectSummary[];
  label: string;
  showCount?: boolean;
};

/** Barra de progresso de um ou mais projetos. Usa a cor --accent do elemento pai. */
export function ProgressMeter({ projects, label, showCount = true }: Props) {
  const t = useTranslations("progress");
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => s.completedSteps);
  const { done, total, ratio } = aggregateProgress(projects, hydrated ? completed : {});
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={t("stepsDone", { done, total })}
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="accent-bar h-full transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      {showCount && total > 0 && (
        <p className="mt-1.5 font-mono text-xs text-zinc-400">{t("stepsDone", { done, total })}</p>
      )}
    </div>
  );
}
