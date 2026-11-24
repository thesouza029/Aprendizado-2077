"use client";

import { useTranslations } from "next-intl";
import type { ProjectSummary } from "@/lib/content";
import { useHydrated } from "@/lib/hooks";
import { aggregateProgress } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";

export function OverallProgress({ projects }: { projects: ProjectSummary[] }) {
  const t = useTranslations("nav");
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => s.completedSteps);
  const percent = Math.round(aggregateProgress(projects, hydrated ? completed : {}).ratio * 100);
  const label = t("overallProgress", { percent });

  return (
    <div className="hidden items-center gap-2 md:flex" title={label}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
      >
        <div className="accent-bar h-full transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 font-mono text-xs text-zinc-300" aria-hidden>
        {percent}%
      </span>
    </div>
  );
}
