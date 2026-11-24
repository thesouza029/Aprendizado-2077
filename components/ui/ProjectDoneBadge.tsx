"use client";

import type { ProjectSummary } from "@/lib/content";
import { useHydrated } from "@/lib/hooks";
import { projectProgress } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";

/** Selo "Concluído" (só aparece com o projeto 100% feito) */
export function ProjectDoneBadge({ project, label }: { project: ProjectSummary; label: string }) {
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => s.completedSteps);
  if (!hydrated || projectProgress(project, completed).ratio < 1) return null;
  return (
    <span className="accent-bar rounded-full px-2 py-0.5 font-semibold text-night-950">✓ {label}</span>
  );
}
