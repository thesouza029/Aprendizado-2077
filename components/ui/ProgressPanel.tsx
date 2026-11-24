"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import type { ProjectSummary } from "@/lib/content";
import { useHydrated } from "@/lib/hooks";
import {
  aggregateProgress,
  findNextStep,
  parseImportedProgress,
  serializeProgress,
} from "@/lib/progress";
import { getProgressSnapshot, useProgressStore } from "@/store/progress";

export type StepLabels = Record<
  string,
  { title: string; trackName: string; color: string; steps: Record<string, string> }
>;

type Props = {
  projects: ProjectSummary[];
  labels: StepLabels;
  /** versão em coluna única, para caber no painel lateral da cidade 3D */
  compact?: boolean;
};

/** Painel da Torre Central: progresso geral, próximo passo e backup */
export function ProgressPanel({ projects, labels, compact = false }: Props) {
  const t = useTranslations("progress");
  const tc = useTranslations("common");
  const hydrated = useHydrated();
  const completed = useProgressStore((s) => s.completedSteps);
  const lastProject = useProgressStore((s) => s.lastProject);
  const replaceAll = useProgressStore((s) => s.replaceAll);
  const reset = useProgressStore((s) => s.reset);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const done = hydrated ? completed : {};
  const overall = aggregateProgress(projects, done);
  const percent = Math.round(overall.ratio * 100);
  const next = findNextStep(projects, done, hydrated ? lastProject : null);
  const nextLabel = next ? labels[next.projectId] : undefined;

  const exportFile = () => {
    const blob = new Blob([serializeProgress(getProgressSnapshot())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devcity-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseImportedProgress(await file.text());
    if (result.ok) {
      replaceAll(result.data);
      setMessage({ kind: "ok", text: t("importSuccess") });
    } else {
      const errors = {
        "invalid-json": t("importInvalidJson"),
        "not-devcity": t("importNotDevcity"),
        "newer-version": t("importNewerVersion"),
      } as const;
      setMessage({ kind: "error", text: errors[result.error] });
    }
  };

  const btn =
    "rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-white/30 hover:text-white";

  return (
    <section
      id="progress"
      aria-labelledby="progress-title"
      className={compact ? "grid gap-6" : "panel grid gap-6 p-6 md:grid-cols-[1fr_1.2fr]"}
    >
      <div className="space-y-4">
        <h2 id="progress-title" className="font-display text-lg font-semibold text-hub">
          {t("title")}
        </h2>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-300">{t("overall")}</span>
            <span className="font-display text-3xl font-bold text-white">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("overall")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div className="accent-bar h-full transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-xs text-zinc-400">
            {t("stepsDone", { done: overall.done, total: overall.total })}
          </p>
        </div>

        <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm">
          <p className="font-medium text-amber-200">{t("localOnly")}</p>
          <p className="mt-1 text-zinc-300">{t("localOnlyHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={exportFile} className={btn}>
              {t("export")}
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={btn}>
              {t("import")}
            </button>
            {/* escondido de todo (inclusive de leitores de tela): quem abre o seletor é o botão acima */}
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importFile} />
            {!confirmingReset ? (
              <button type="button" onClick={() => setConfirmingReset(true)} className={`${btn} text-rose-300`}>
                {t("reset")}
              </button>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-rose-200">{t("resetConfirm")}</span>
                <button
                  type="button"
                  className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-400"
                  onClick={() => {
                    reset();
                    setConfirmingReset(false);
                    setMessage({ kind: "ok", text: t("resetDone") });
                  }}
                >
                  {tc("confirm")}
                </button>
                <button type="button" className={btn} onClick={() => setConfirmingReset(false)}>
                  {tc("cancel")}
                </button>
              </span>
            )}
          </div>
          <p role="status" className={message?.kind === "error" ? "mt-2 text-rose-300" : "mt-2 text-emerald-300"}>
            {message?.text}
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <h3 className="font-display text-lg font-semibold text-zinc-100">{t("nextStep")}</h3>
        {next && nextLabel ? (
          <Link
            href={`/tracks/${next.track}/${next.projectId}#step-${next.stepId}`}
            style={{ "--accent": nextLabel.color } as CSSProperties}
            className="accent-border accent-soft group mt-3 flex flex-1 flex-col justify-between gap-4 rounded-xl border p-5 hover:accent-glow"
          >
            <div>
              <p className="accent-text font-mono text-xs uppercase tracking-wider">{nextLabel.trackName}</p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{nextLabel.title}</p>
              <p className="mt-2 text-zinc-200">
                {t("nextStepLabel", {
                  number: next.stepIndex + 1,
                  step: nextLabel.steps[next.stepId] ?? next.stepId,
                })}
              </p>
            </div>
            <span className="accent-text text-sm font-semibold">
              {t("continue")} <span aria-hidden>→</span>
            </span>
          </Link>
        ) : (
          <p className="mt-3 text-zinc-300">{t("noNextStep")}</p>
        )}
      </div>
    </section>
  );
}
