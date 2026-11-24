"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  HUB_ID,
  districtDestinationId,
  projectDestinationId,
  type CityLayout,
} from "@/lib/city-layout";
import type { CityData, CityDistrictData, CityProjectData } from "@/lib/city-types";
import { stepKey } from "@/lib/progress";
import { travelTo, useCityStore } from "@/store/city";
import { useProgressStore } from "@/store/progress";
import { ProgressMeter } from "../ProgressMeter";
import { ProgressPanel, type StepLabels } from "../ProgressPanel";

type Props = { layout: CityLayout; data: CityData };

const primaryBtn =
  "accent-bar inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-night-950 hover:opacity-90";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-100 hover:border-white/40";

/**
 * Painel 2D que abre por cima da cena quando a câmera chega a um destino.
 * Não é modal: a cidade continua visível e clicável. Esc fecha.
 */
export function CityPanel({ layout, data }: Props) {
  const t = useTranslations("city");
  const activeId = useCityStore((s) => s.activeId);
  const closePanel = useCityStore((s) => s.closePanel);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (activeId) headingRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      // se a busca global estiver aberta, o Esc é dela
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closePanel]);

  const content = useMemo(() => resolve(activeId, data), [activeId, data]);
  if (!content) return null;

  let eyebrow = "";
  let title = "";
  let color = data.hubColor;
  let body: ReactNode = null;

  if (content.kind === "hub") {
    title = data.hubName;
    body = <HubBody data={data} />;
  } else if (content.kind === "district") {
    title = content.district.name;
    color = content.district.color;
    body =
      content.district.kind === "library" ? (
        <LibraryBody district={content.district} />
      ) : (
        <DistrictBody district={content.district} layout={layout} />
      );
  } else {
    eyebrow = content.district.name;
    title = content.project.title;
    color = content.district.color;
    body = <ProjectBody project={content.project} district={content.district} layout={layout} />;
  }

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="city-panel-title"
      style={{ "--accent": color } as CSSProperties}
      className="panel accent-border fixed inset-x-0 bottom-0 z-30 max-h-[72vh] overflow-y-auto rounded-b-none p-5 sm:inset-x-auto sm:top-28 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-[26rem] sm:rounded-b-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="accent-text font-mono text-xs uppercase tracking-wider">{eyebrow}</p>}
          <h2
            id="city-panel-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-display accent-text neon-text text-2xl font-bold"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label={t("closePanel")}
          className="rounded-md border border-white/15 px-2 py-1 text-zinc-300 hover:text-white"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
      <div className="mt-4 space-y-5">{body}</div>
    </aside>
  );
}

type Resolved =
  | { kind: "hub" }
  | { kind: "district"; district: CityDistrictData }
  | { kind: "project"; district: CityDistrictData; project: CityProjectData };

function resolve(id: string | null, data: CityData): Resolved | null {
  if (!id) return null;
  if (id === HUB_ID) return { kind: "hub" };
  for (const district of data.districts) {
    if (id === districtDestinationId(district.id)) return { kind: "district", district };
    for (const project of district.projects) {
      if (id === projectDestinationId(project.id)) return { kind: "project", district, project };
    }
  }
  return null;
}

function HubBody({ data }: { data: CityData }) {
  const t = useTranslations("hub");
  const projects = useMemo(() => data.districts.flatMap((d) => d.projects), [data]);
  const labels = useMemo(() => {
    const out: StepLabels = {};
    for (const d of data.districts) {
      for (const p of d.projects) {
        out[p.id] = {
          title: p.title,
          trackName: d.name,
          color: d.color,
          steps: Object.fromEntries(p.steps.map((s) => [s.id, s.title])),
        };
      }
    }
    return out;
  }, [data]);

  return (
    <>
      <p className="text-zinc-300">{t("subtitle")}</p>
      <ProgressPanel projects={projects} labels={labels} compact />
    </>
  );
}

function DistrictBody({ district, layout }: { district: CityDistrictData; layout: CityLayout }) {
  const t = useTranslations("city");
  const tt = useTranslations("track");
  const buildings = layout.districts.find((d) => d.id === district.id)?.buildings ?? [];

  return (
    <>
      <p className="text-zinc-300">{district.tagline}</p>
      <ProgressMeter projects={district.projects} label={district.name} />

      {district.whyPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{tt("whyTitle")}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            {district.whyPoints.slice(0, 2).map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="accent-bar mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{tt("projectsTitle")}</h3>
        <ul className="mt-2 space-y-2">
          {district.projects.map((p) => {
            const building = buildings.find((b) => b.projectId === p.id);
            return (
              <li key={p.id} className="rounded-lg border border-white/10 p-3">
                <p className="font-medium text-white">{p.title}</p>
                <div className="mt-2">
                  <ProgressMeter projects={[p]} label={p.title} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {building && (
                    <button type="button" className={secondaryBtn} onClick={() => travelTo(building.view)}>
                      {t("seeBuilding")}
                    </button>
                  )}
                  <Link href={p.href} className={secondaryBtn}>
                    {t("openProject")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Link href={district.href} className={primaryBtn}>
        {t("openDistrict")}
      </Link>
    </>
  );
}

function LibraryBody({ district }: { district: CityDistrictData }) {
  const t = useTranslations("city");
  return (
    <>
      <p className="text-zinc-300">{district.tagline}</p>
      <p className="font-mono text-xs text-zinc-400">{district.meta}</p>
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{t("topTechnologies")}</h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {district.topTechnologies.map((tech) => (
            <li key={tech.slug}>
              <Link
                href={`/library?tech=${tech.slug}`}
                className="accent-soft inline-block rounded-md px-2 py-1 text-xs text-zinc-100 hover:text-white"
              >
                {tech.label} <span className="text-zinc-400">({tech.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Link href={district.href} className={primaryBtn}>
        {t("openLibrary")}
      </Link>
    </>
  );
}

function ProjectBody({
  project,
  district,
  layout,
}: {
  project: CityProjectData;
  district: CityDistrictData;
  layout: CityLayout;
}) {
  const t = useTranslations("city");
  const tt = useTranslations("track");
  const completed = useProgressStore((s) => s.completedSteps);
  const nextIndex = project.steps.findIndex((s) => !(stepKey(project.id, s.id) in completed));
  const next = nextIndex >= 0 ? project.steps[nextIndex] : undefined;
  const districtView = layout.districts.find((d) => d.id === district.id)?.view;

  return (
    <>
      <div className="flex flex-wrap gap-2 font-mono text-xs uppercase">
        <span className="accent-soft accent-text rounded-full px-2 py-0.5 font-semibold">
          {tt("level", { level: project.level })}
        </span>
        <span className="text-zinc-400">{tt("steps", { count: project.steps.length })}</span>
      </div>
      <p className="text-zinc-300">{project.whatYouBuild}</p>
      <ProgressMeter projects={[project]} label={project.title} />

      {next ? (
        <Link href={`${project.href}#step-${next.id}`} className={primaryBtn}>
          {t("continueStep", { number: nextIndex + 1, step: next.title })}
        </Link>
      ) : (
        <p className="accent-text font-semibold">{t("projectComplete")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={project.href} className={secondaryBtn}>
          {t("openProject")}
        </Link>
        {districtView && (
          <button type="button" className={secondaryBtn} onClick={() => travelTo(districtView)}>
            {t("backToDistrict")}
          </button>
        )}
      </div>
    </>
  );
}
