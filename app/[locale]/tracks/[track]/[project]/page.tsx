import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangBadge } from "@/components/ui/Badges";
import { InlineMarkdown, Markdown } from "@/components/ui/Markdown";
import { ProjectStatus } from "@/components/ui/ProjectStatus";
import { StepShell } from "@/components/ui/StepShell";
import { getProject, getProjects, getResourcesByIds, getTrack } from "@/lib/content";
import { tr } from "@/lib/schemas";

type Props = { params: Promise<{ locale: string; track: string; project: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ track: p.track, project: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, track, project: id } = await params;
  const project = getProject(track, id);
  if (!project) return {};
  return { title: tr(project.title, locale), description: tr(project.whatYouBuild, locale) };
}

/** Página de um projeto (prédio): etapas com checklist */
export default async function ProjectPage({ params }: Props) {
  const { locale, track: trackId, project: id } = await params;
  setRequestLocale(locale);
  const track = getTrack(trackId);
  const project = getProject(trackId, id);
  if (!track || !project) notFound();

  const t = await getTranslations("project");
  const tt = await getTranslations("track");
  const tc = await getTranslations("common");
  const tTypes = await getTranslations("resourceTypes");
  const tLang = await getTranslations("languages");

  const title = tr(project.title, locale);
  const trackName = tr(track.name, locale);
  const summary = {
    id: project.id,
    track: project.track,
    order: project.order,
    steps: project.steps.map((s) => ({ id: s.id })),
  };
  const prerequisites = project.prerequisites
    .map((pre) => getProjects().find((p) => p.id === pre))
    .filter((p) => p !== undefined);

  return (
    <div
      className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:py-14"
      style={{ "--accent": track.color } as CSSProperties}
    >
      <nav aria-label="Breadcrumb">
        <Link href={`/tracks/${track.id}`} className="accent-text text-sm hover:underline">
          <span aria-hidden>← </span>
          {t("backToTrack", { track: trackName })}
        </Link>
      </nav>

      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase">
          <span className="accent-soft accent-text rounded-full px-2 py-0.5 font-semibold">
            {tt("level", { level: project.level })}
          </span>
          <span className="text-zinc-400">{tt("steps", { count: project.steps.length })}</span>
        </div>
        <h1 className="font-display neon-text text-4xl font-bold text-white sm:text-5xl">{title}</h1>
        <ProjectStatus project={summary} title={title} completeMessage={t("projectComplete")} />
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-display accent-text text-lg font-semibold">{t("whatYouBuild")}</h2>
          <p className="mt-2 leading-relaxed text-zinc-200">{tr(project.whatYouBuild, locale)}</p>
          <h3 className="mt-4 text-sm font-semibold text-zinc-100">{t("stack")}</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <li key={s} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-300">
                {s}
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold text-zinc-100">{tt("prerequisites")}</h3>
          {prerequisites.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-300">{t("prerequisitesNone")}</p>
          ) : (
            <ul className="mt-1 text-sm">
              {prerequisites.map((p) => (
                <li key={p.id}>
                  <Link href={`/tracks/${p.track}/${p.id}`} className="accent-text hover:underline">
                    {tr(p.title, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="font-display accent-text text-lg font-semibold">{t("whatYouLearn")}</h2>
          <ul className="mt-3 space-y-2">
            {project.whatYouLearn.map((item) => (
              <li key={item.pt} className="flex gap-3 text-zinc-200">
                <span aria-hidden className="accent-bar mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{tr(item, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="font-display text-2xl font-semibold text-white">
          {t("stepsTitle")}
        </h2>
        <ol className="mt-6 space-y-5">
          {project.steps.map((step, i) => {
            const resources = getResourcesByIds(step.resources);
            return (
              <StepShell
                key={step.id}
                projectId={project.id}
                stepId={step.id}
                number={i + 1}
                title={tr(step.title, locale)}
                minutesLabel={tc("minutes", { minutes: step.estimatedMinutes })}
              >
                <div className="accent-soft rounded-lg p-3">
                  <p className="accent-text text-xs font-semibold uppercase tracking-wider">{t("goal")}</p>
                  <p className="mt-1 text-zinc-100">{tr(step.goal, locale)}</p>
                </div>

                <div className="mt-5">
                  <Markdown>{tr(step.instructions, locale)}</Markdown>
                </div>

                {step.hint && (
                  <details className="mt-5 rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
                      {t("showHint")}
                    </summary>
                    <div className="mt-2 text-sm">
                      <Markdown>{tr(step.hint, locale)}</Markdown>
                    </div>
                  </details>
                )}

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">{t("checklist")}</h4>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {step.checklist.map((c) => (
                        <li key={c.pt} className="flex gap-2 text-zinc-300">
                          <span aria-hidden className="accent-text">▢</span>
                          <InlineMarkdown>{tr(c, locale)}</InlineMarkdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {resources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">{t("resources")}</h4>
                      <ul className="mt-2 space-y-2 text-sm">
                        {resources.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-2">
                            <LangBadge
                              language={r.language}
                              label={tLang(r.language === "pt-BR" ? "pt" : "en")}
                            />
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-100 underline underline-offset-2 hover:text-white"
                            >
                              {r.title}
                              <span className="sr-only"> {tc("opensInNewTab")}</span>
                            </a>
                            <span className="text-xs text-zinc-400">{tTypes(r.type)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </StepShell>
            );
          })}
        </ol>
      </section>

      {project.extraChallenges.length > 0 && (
        <section aria-labelledby="extra-title" className="panel p-5">
          <h2 id="extra-title" className="font-display accent-text text-lg font-semibold">
            {t("extraChallenges")}
          </h2>
          <ul className="mt-3 space-y-2">
            {project.extraChallenges.map((c) => (
              <li key={c.pt} className="flex gap-3 text-zinc-200">
                <span aria-hidden className="accent-text">★</span>
                <InlineMarkdown>{tr(c, locale)}</InlineMarkdown>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="portfolio-title" className="panel accent-border p-5">
        <h2 id="portfolio-title" className="font-display accent-text text-lg font-semibold">
          {t("portfolioTip")}
        </h2>
        <p className="mt-2 leading-relaxed text-zinc-200">{tr(project.portfolioTip, locale)}</p>
      </section>
    </div>
  );
}
