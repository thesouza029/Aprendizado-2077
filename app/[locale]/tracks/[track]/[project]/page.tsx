import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangBadge } from "@/components/ui/Badges";
import { InlineMarkdown, Markdown } from "@/components/ui/Markdown";
import { CriteriaChecklist } from "@/components/ui/CriteriaChecklist";
import { ProjectStatus } from "@/components/ui/ProjectStatus";
import { StepShell } from "@/components/ui/StepShell";
import { getProject, getProjects, getResourcesByIds, getTrack } from "@/lib/content";
import { isTranslated, tr } from "@/lib/schemas";

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
        {project.feature && (
          <p className="text-lg text-zinc-200">
            <span className="accent-text font-semibold">{t("featureLabel")}: </span>
            {tr(project.feature, locale)}
          </p>
        )}
        {!isTranslated(project.whatYouBuild, locale) && (
          <p role="note" className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-zinc-200">
            {t("notTranslated")}
          </p>
        )}
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
            const videos = getResourcesByIds(step.videos ?? []);
            const resources = getResourcesByIds(step.resources).filter(
              (r) => !(step.videos ?? []).includes(r.id),
            );
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
                  <div className="mt-1 text-zinc-100">
                    <InlineMarkdown>{tr(step.goal, locale)}</InlineMarkdown>
                  </div>
                </div>

                {step.concepts && step.concepts.length > 0 && (
                  <section className="mt-5" aria-label={t("concepts")}>
                    <h4 className="font-display text-base font-semibold text-white">{t("concepts")}</h4>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      {step.concepts.map((c) => (
                        <div key={c.term.pt} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <dt className="accent-text font-semibold">{tr(c.term, locale)}</dt>
                          <dd className="mt-1 text-sm leading-relaxed text-zinc-300">
                            <InlineMarkdown>{tr(c.explanation, locale)}</InlineMarkdown>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                <div className="mt-6">
                  <Markdown>{tr(step.instructions, locale)}</Markdown>
                </div>

                {step.commonErrors && step.commonErrors.length > 0 && (
                  <details className="mt-5 rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
                      {t("commonErrors")}
                    </summary>
                    <ul className="mt-3 space-y-3 text-sm">
                      {step.commonErrors.map((e) => (
                        <li key={e.problem.pt}>
                          <p className="font-semibold text-zinc-100">
                            <InlineMarkdown>{tr(e.problem, locale)}</InlineMarkdown>
                          </p>
                          <div className="mt-1 text-zinc-300">
                            <Markdown>{tr(e.solution, locale)}</Markdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {step.hint && (
                  <details className="mt-3 rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
                      {t("showHint")}
                    </summary>
                    <div className="mt-2 text-sm">
                      <Markdown>{tr(step.hint, locale)}</Markdown>
                    </div>
                  </details>
                )}

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <CriteriaChecklist
                    projectId={project.id}
                    stepId={step.id}
                    items={step.checklist.map((c) => (
                      <InlineMarkdown key={c.pt}>{tr(c, locale)}</InlineMarkdown>
                    ))}
                  />
                  {(videos.length > 0 || resources.length > 0) && (
                    <div className="space-y-5">
                      {videos.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-100">{t("videos")}</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            {videos.map((r) => (
                              <li key={r.id} className="flex flex-wrap items-center gap-2">
                                <span aria-hidden className="accent-text">▶</span>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-100 underline underline-offset-2 hover:text-white"
                                >
                                  {r.title}
                                  <span className="sr-only"> {tc("opensInNewTab")}</span>
                                </a>
                                <span className="text-xs text-zinc-400">{r.author}</span>
                                <LangBadge
                                  language={r.language}
                                  label={tLang(r.language === "pt-BR" ? "pt" : "en")}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
