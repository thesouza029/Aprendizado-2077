import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { getProjectSummaries, getProjects, getTrack, getTracks } from "@/lib/content";
import { tr } from "@/lib/schemas";

type Props = { params: Promise<{ locale: string; track: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getTracks().map((t) => ({ track: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, track: id } = await params;
  const track = getTrack(id);
  if (!track) return {};
  return { title: tr(track.name, locale), description: tr(track.tagline, locale) };
}

/** Página de um distrito (trilha) */
export default async function TrackPage({ params }: Props) {
  const { locale, track: id } = await params;
  setRequestLocale(locale);
  const track = getTrack(id);
  if (!track) notFound();

  const t = await getTranslations("track");
  const projects = getProjects(track.id);
  const summaries = getProjectSummaries().filter((p) => p.track === track.id);
  const name = tr(track.name, locale);

  return (
    <div
      className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-14"
      style={{ "--accent": track.color } as CSSProperties}
    >
      <header className="max-w-3xl">
        <h1 className="font-display neon-text accent-text text-4xl font-bold sm:text-5xl">{name}</h1>
        <p className="mt-3 text-lg text-zinc-300">{tr(track.tagline, locale)}</p>
        {summaries.length > 0 && (
          <div className="mt-6 max-w-md">
            <ProgressMeter projects={summaries} label={name} />
          </div>
        )}
      </header>

      {track.project && (
        <section aria-labelledby="district-project-title" className="panel p-6">
          <p className="accent-text font-mono text-xs uppercase tracking-wider">{t("projectTitle")}</p>
          <h2 id="district-project-title" className="font-display mt-1 text-2xl font-semibold text-white">
            {tr(track.project.name, locale)}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-zinc-200">{tr(track.project.summary, locale)}</p>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">{t("projectHow")}</p>
        </section>
      )}

      <section aria-labelledby="why-title" className="panel accent-border grid gap-6 p-6 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 id="why-title" className="font-display accent-text text-xl font-semibold">
            {t("whyTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {track.whyLearn.points.map((p) => (
              <li key={p.pt} className="flex gap-3 text-zinc-200">
                <span aria-hidden className="accent-bar mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{tr(p, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{t("jobsTitle")}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {track.whyLearn.jobs.map((j) => (
                <li key={j.pt} className="accent-soft rounded-md px-2 py-1 text-xs text-zinc-100">
                  {tr(j, locale)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{t("sourcesTitle")}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {track.whyLearn.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 underline underline-offset-2 hover:text-white"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="projects-title">
        <h2 id="projects-title" className="font-display text-2xl font-semibold text-white">
          {t("projectsTitle")}
        </h2>
        {projects.length === 0 ? (
          <p className="panel mt-4 p-6 text-zinc-300">{t("emptyProjects")}</p>
        ) : (
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  project={p}
                  locale={locale}
                  prerequisiteTitles={p.prerequisites.map((pre) => {
                    const found = getProjects().find((x) => x.id === pre);
                    return found ? tr(found.title, locale) : pre;
                  })}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

