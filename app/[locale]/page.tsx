import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DistrictCard } from "@/components/ui/DistrictCard";
import { HubSwitch } from "@/components/ui/HubSwitch";
import { ProgressPanel, type StepLabels } from "@/components/ui/ProgressPanel";
import {
  HUB_COLOR,
  LIBRARY_COLOR,
  getProjectSummaries,
  getProjects,
  getResources,
  getTracks,
} from "@/lib/content";
import type { CityData } from "@/lib/city-types";
import { tr } from "@/lib/schemas";
import { techLabel } from "@/lib/technologies";

type Props = { params: Promise<{ locale: string }> };

/** Torre Central (Hub) no modo 2D */
export default async function HubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hub");

  const tracks = getTracks();
  const summaries = getProjectSummaries();

  const labels: StepLabels = {};
  for (const p of getProjects()) {
    const track = tracks.find((tk) => tk.id === p.track);
    labels[p.id] = {
      title: tr(p.title, locale),
      trackName: track ? tr(track.name, locale) : p.track,
      color: track?.color ?? "#67e8f9",
      steps: Object.fromEntries(p.steps.map((s) => [s.id, tr(s.title, locale)])),
    };
  }

  const cityData = await buildCityData(locale);

  return (
    <HubSwitch city={{ data: cityData }}>
      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:py-14">
        <section aria-labelledby="hub-title" className="max-w-3xl">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-hub">{t("eyebrow")}</p>
          <h1 id="hub-title" className="font-display neon-text mt-3 text-4xl font-bold text-white sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-300">{t("subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/tracks/fundamentos"
              className="rounded-lg bg-fundamentos px-5 py-2.5 font-semibold text-night-950 shadow-[0_0_24px_-6px_var(--color-fundamentos)] hover:brightness-110"
            >
              {t("ctaStart")}
            </Link>
            <Link
              href="/library"
              className="rounded-lg border border-library/60 px-5 py-2.5 font-semibold text-library hover:bg-library/10"
            >
              {t("ctaLibrary")}
            </Link>
          </div>
        </section>

        <ProgressPanel projects={summaries} labels={labels} />

        <section aria-labelledby="districts-title">
          <h2 id="districts-title" className="font-display text-2xl font-semibold text-white">
            {t("districtsTitle")}
          </h2>
          <p className="mt-2 text-zinc-300">{t("districtsSubtitle")}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <DistrictCard
                href="/library"
                color={LIBRARY_COLOR}
                name={t("libraryName")}
                tagline={t("libraryTagline")}
                meta={t("libraryCount", { count: getResources().length })}
              />
            </li>
            {tracks.map((track) => {
              const projects = summaries.filter((p) => p.track === track.id);
              return (
                <li key={track.id}>
                  <DistrictCard
                    href={`/tracks/${track.id}`}
                    color={track.color}
                    name={tr(track.name, locale)}
                    tagline={tr(track.tagline, locale)}
                    meta={t("projectsCount", { count: projects.length })}
                    badge={track.recommendedFirst ? t("recommendedFirst") : undefined}
                    projects={projects}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </HubSwitch>
  );
}

/** Dados da cidade 3D, já traduzidos (só o necessário: sem as instruções das etapas) */
async function buildCityData(locale: string): Promise<CityData> {
  const t = await getTranslations("hub");
  const tNav = await getTranslations("nav");
  const resources = getResources();

  const techCount = new Map<string, number>();
  for (const r of resources) for (const tech of r.technologies) techCount.set(tech, (techCount.get(tech) ?? 0) + 1);
  const topTechnologies = [...techCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({ slug, label: techLabel(slug, locale), count }));

  const tracks = getTracks().map((track) => {
    const projects = getProjects(track.id).map((p) => ({
      id: p.id,
      track: p.track,
      order: p.order,
      title: tr(p.title, locale),
      level: p.level,
      href: `/tracks/${p.track}/${p.id}`,
      whatYouBuild: tr(p.whatYouBuild, locale),
      steps: p.steps.map((s) => ({ id: s.id, title: tr(s.title, locale) })),
    }));
    return {
      id: track.id,
      kind: "track" as const,
      name: tr(track.name, locale),
      tagline: tr(track.tagline, locale),
      color: track.color,
      href: `/tracks/${track.id}`,
      meta: t("projectsCount", { count: projects.length }),
      recommended: Boolean(track.recommendedFirst),
      whyPoints: track.whyLearn.points.map((pt) => tr(pt, locale)),
      projects,
      topTechnologies: [],
    };
  });

  return {
    hubName: tNav("hub"),
    hubColor: HUB_COLOR,
    districts: [
      {
        id: "library",
        kind: "library",
        name: t("libraryName"),
        tagline: t("libraryTagline"),
        color: LIBRARY_COLOR,
        href: "/library",
        meta: t("libraryCount", { count: resources.length }),
        recommended: false,
        whyPoints: [],
        projects: [],
        topTechnologies,
      },
      ...tracks,
    ],
  };
}
