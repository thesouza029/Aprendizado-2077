"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";
import { criterionKey, stepKey } from "@/lib/progress";
import { useProgressStore } from "@/store/progress";

type Props = {
  projectId: string;
  stepId: string;
  /** cada critério já renderizado no servidor (markdown em linha) */
  items: ReactNode[];
};

/**
 * Critérios de pronto como caixinhas de verdade: cada uma fica salva no progresso
 * deste navegador. Quando todas estão marcadas, sugere concluir a etapa.
 */
export function CriteriaChecklist({ projectId, stepId, items }: Props) {
  const t = useTranslations("project");
  const hydrated = useHydrated();
  const baseId = useId();
  const checked = useProgressStore((s) => s.checkedCriteria);
  const stepDone = useProgressStore((s) => hydrated && stepKey(projectId, stepId) in s.completedSteps);
  const setCriterionChecked = useProgressStore((s) => s.setCriterionChecked);
  const setStepDone = useProgressStore((s) => s.setStepDone);

  const isChecked = (i: number) => hydrated && criterionKey(projectId, stepId, i) in checked;
  const total = items.length;
  const done = items.filter((_, i) => isChecked(i)).length;
  const allDone = total > 0 && done === total;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-zinc-100">{t("checklist")}</h4>
        <p className="font-mono text-xs text-zinc-400" aria-live="polite">
          {t("criteriaProgress", { done, total })}
        </p>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => {
          const id = `${baseId}-${i}`;
          const on = isChecked(i);
          return (
            <li key={i}>
              <label
                htmlFor={id}
                className={clsx(
                  "flex cursor-pointer gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5",
                  on ? "text-zinc-100" : "text-zinc-300",
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  disabled={!hydrated}
                  onChange={(e) => setCriterionChecked(projectId, stepId, i, e.target.checked)}
                  className="accent-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                />
                <span className={clsx(on && "line-through decoration-white/30")}>{item}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {allDone && !stepDone && (
        <div className="accent-soft mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 text-sm">
          <span className="text-zinc-100">{t("criteriaAllDone")}</span>
          <button
            type="button"
            onClick={() => setStepDone(projectId, stepId, true)}
            className="accent-bar rounded-lg px-3 py-1.5 font-semibold text-night-950 hover:opacity-90"
          >
            {t("markDone")}
          </button>
        </div>
      )}
    </div>
  );
}
