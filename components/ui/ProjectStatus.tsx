"use client";

import { useEffect } from "react";
import type { ProjectSummary } from "@/lib/content";
import { useHydrated } from "@/lib/hooks";
import { projectProgress } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";
import { ProgressMeter } from "./ProgressMeter";

type Props = { project: ProjectSummary; title: string; completeMessage: string };

/** Progresso do projeto + registra como "último aberto" (usado no próximo passo) */
export function ProjectStatus({ project, title, completeMessage }: Props) {
  const hydrated = useHydrated();
  const setLastProject = useProgressStore((s) => s.setLastProject);
  const completed = useProgressStore((s) => s.completedSteps);
  const complete = hydrated && projectProgress(project, completed).ratio === 1;

  useEffect(() => {
    setLastProject(project.track, project.id);
  }, [project.track, project.id, setLastProject]);

  return (
    <div className="space-y-3">
      <ProgressMeter projects={[project]} label={title} />
      <p role="status" className="accent-text text-sm font-semibold">
        {complete ? completeMessage : ""}
      </p>
    </div>
  );
}
