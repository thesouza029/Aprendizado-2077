import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/lib/schemas";
import { tr } from "@/lib/schemas";
import { ProgressMeter } from "./ProgressMeter";
import { ProjectDoneBadge } from "./ProjectDoneBadge";

type Props = { project: Project; locale: string; prerequisiteTitles: string[] };

/** Um projeto da trilha = um prédio do distrito */
export async function ProjectCard({ project, locale, prerequisiteTitles }: Props) {
  const t = await getTranslations("track");
  const title = tr(project.title, locale);
  // só ids vão para o cliente, não os textos das etapas
  const summary = {
    id: project.id,
    track: project.track,
    order: project.order,
    steps: project.steps.map((s) => ({ id: s.id })),
  };

  return (
    <article className="panel accent-border relative flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase">
        <span className="accent-soft accent-text rounded-full px-2 py-0.5 font-semibold">
          {t("level", { level: project.level })}
        </span>
        {project.bonus && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-200">{t("bonus")}</span>
        )}
        <span className="text-zinc-400">{t("steps", { count: project.steps.length })}</span>
        <ProjectDoneBadge project={summary} label={t("completed")} />
      </div>

      <h3 className="font-display text-xl font-semibold text-white">
        <Link href={`/tracks/${project.track}/${project.id}`} className="after:absolute after:inset-0 hover:underline">
          <span className="text-zinc-400">{String(project.order).padStart(2, "0")} · </span>
          {title}
        </Link>
      </h3>
      {project.feature && (
        <p className="accent-text text-sm font-semibold">+ {tr(project.feature, locale)}</p>
      )}
      <p className="text-sm leading-relaxed text-zinc-300">{tr(project.whatYouBuild, locale)}</p>

      <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
        {project.stack.map((s) => (
          <li key={s} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-300">
            {s}
          </li>
        ))}
      </ul>

      {prerequisiteTitles.length > 0 && (
        <p className="text-xs text-zinc-400">
          {t("prerequisites")}: {prerequisiteTitles.join(", ")}
        </p>
      )}

      <div className="mt-auto pt-2">
        <ProgressMeter projects={[summary]} label={title} />
      </div>
    </article>
  );
}
