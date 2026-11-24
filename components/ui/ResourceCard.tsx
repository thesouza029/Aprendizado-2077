"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useHydrated } from "@/lib/hooks";
import { resourceStatuses, type ResourceStatus } from "@/lib/progress";
import { tr, type Resource } from "@/lib/schemas";
import { techLabel } from "@/lib/technologies";
import { useProgressStore } from "@/store/progress";
import { LangBadge } from "./Badges";

export function ResourceCard({ resource }: { resource: Resource }) {
  const locale = useLocale();
  const t = useTranslations("library");
  const tTypes = useTranslations("resourceTypes");
  const tLevels = useTranslations("levels");
  const tLang = useTranslations("languages");
  const tStatus = useTranslations("status");
  const tc = useTranslations("common");
  const hydrated = useHydrated();
  const status = useProgressStore((s) => (hydrated ? s.resourceStatus[resource.id] : undefined));
  const setStatus = useProgressStore((s) => s.setResourceStatus);

  const toggle = (value: ResourceStatus) => setStatus(resource.id, status === value ? null : value);

  return (
    <article className="panel flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase">
        <span className="rounded bg-library/15 px-1.5 py-0.5 font-semibold text-library">
          {tTypes(resource.type)}
        </span>
        <LangBadge language={resource.language} label={tLang(resource.language === "pt-BR" ? "pt" : "en")} />
        <span className="text-zinc-400">{tLevels(resource.level)}</span>
        {!resource.verified && (
          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">{t("needsVerification")}</span>
        )}
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug text-white">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-library hover:underline"
        >
          {resource.title}
          <span aria-hidden className="ml-1 text-sm text-zinc-400">↗</span>
          <span className="sr-only"> {tc("opensInNewTab")}</span>
        </a>
      </h3>
      <p className="text-xs text-zinc-400">{resource.author}</p>
      <p className="text-sm leading-relaxed text-zinc-300">{tr(resource.description, locale)}</p>

      <ul className="flex flex-wrap gap-1.5">
        {resource.technologies.map((tech) => (
          <li key={tech} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-300">
            {techLabel(tech, locale)}
          </li>
        ))}
      </ul>

      <div role="group" aria-label={t("statusGroup", { title: resource.title })} className="mt-auto flex gap-1.5 pt-2">
        {resourceStatuses.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => toggle(value)}
            className={clsx(
              "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              status === value
                ? "border-library bg-library text-night-950"
                : "border-white/15 text-zinc-300 hover:border-white/30 hover:text-white",
            )}
          >
            {tStatus(value)}
          </button>
        ))}
      </div>
    </article>
  );
}
