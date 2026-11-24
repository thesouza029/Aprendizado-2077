"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";
import { stepKey } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";

type Props = {
  projectId: string;
  stepId: string;
  number: number;
  title: string;
  minutesLabel: string;
  children: ReactNode;
};

/**
 * Moldura de uma etapa: o conteúdo vem renderizado do servidor (children),
 * e aqui ficam só o estado de concluída e o botão.
 */
export function StepShell({ projectId, stepId, number, title, minutesLabel, children }: Props) {
  const t = useTranslations("project");
  const hydrated = useHydrated();
  const done = useProgressStore((s) => hydrated && stepKey(projectId, stepId) in s.completedSteps);
  const setStepDone = useProgressStore((s) => s.setStepDone);
  const headingId = `step-${stepId}-title`;

  return (
    <li id={`step-${stepId}`} aria-labelledby={headingId} className="scroll-mt-24">
      <article
        className={clsx(
          "panel relative overflow-hidden p-5 transition-colors sm:p-6",
          done ? "accent-border accent-glow" : "border-white/10",
        )}
      >
        {done && <span aria-hidden className="accent-bar absolute inset-y-0 left-0 w-1" />}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="accent-text font-mono text-xs uppercase tracking-wider">
              {t("stepNumber", { number })} · {minutesLabel}
            </p>
            <h3 id={headingId} className="font-display mt-1 text-xl font-semibold text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-pressed={done}
            onClick={() => setStepDone(projectId, stepId, !done)}
            className={clsx(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              done
                ? "accent-bar text-night-950 hover:opacity-90"
                : "border border-white/20 text-zinc-100 hover:border-white/40",
            )}
          >
            {done ? `✓ ${t("done")}` : t("markDone")}
            {done && <span className="sr-only"> ({t("undo")})</span>}
          </button>
        </header>
        <div className="mt-4">{children}</div>
      </article>
    </li>
  );
}
