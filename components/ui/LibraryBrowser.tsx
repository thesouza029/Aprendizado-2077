"use client";

import Fuse from "fuse.js";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/hooks";
import { resourceStatuses, type Preferences, type ResourceStatus } from "@/lib/progress";
import { resourceLevels, resourceTypes, type Resource } from "@/lib/schemas";
import { techLabel } from "@/lib/technologies";
import { useProgressStore } from "@/store/progress";
import { ResourceCard } from "./ResourceCard";

type Props = { resources: Resource[] };

const selectCls =
  "w-full rounded-lg border border-white/15 bg-night-900 px-3 py-2 text-sm text-zinc-100 focus:border-library";

export function LibraryBrowser({ resources }: Props) {
  const locale = useLocale();
  const t = useTranslations("library");
  const tTypes = useTranslations("resourceTypes");
  const tLevels = useTranslations("levels");
  const tStatus = useTranslations("status");
  const params = useSearchParams();
  const hydrated = useHydrated();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tech, setTech] = useState(params.get("tech") ?? "");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState<"" | ResourceStatus>("");

  // idioma fica salvo nas preferências (vale para a próxima visita)
  const storedLanguage = useProgressStore((s) => s.preferences.libraryLanguage);
  const setPreference = useProgressStore((s) => s.setPreference);
  const language: Preferences["libraryLanguage"] = hydrated ? storedLanguage : "both";
  const statuses = useProgressStore((s) => s.resourceStatus);

  const technologies = useMemo(
    () =>
      [...new Set(resources.flatMap((r) => r.technologies))].sort((a, b) =>
        techLabel(a, locale).localeCompare(techLabel(b, locale), locale),
      ),
    [resources, locale],
  );

  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: [
          { name: "title", weight: 3 },
          { name: "author", weight: 1 },
          { name: "technologies", weight: 2 },
          { name: "description.pt", weight: 1 },
          { name: "description.en", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [resources],
  );

  const filtered = useMemo(() => {
    const base = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : resources;
    return base.filter(
      (r) =>
        (!tech || r.technologies.includes(tech)) &&
        (!type || r.type === type) &&
        (!level || r.level === level) &&
        (language === "both" || r.language === language) &&
        (!status || (hydrated && statuses[r.id] === status)),
    );
  }, [fuse, query, resources, tech, type, level, language, status, statuses, hydrated]);

  const hasFilters = query || tech || type || level || status || language !== "both";
  const clear = () => {
    setQuery("");
    setTech("");
    setType("");
    setLevel("");
    setStatus("");
    setPreference("libraryLanguage", "both");
  };

  return (
    <div className="space-y-6">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="lib-q" className="mb-1 block text-xs font-medium text-zinc-300">
            {t("searchLabel")}
          </label>
          <input
            id="lib-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={selectCls}
          />
        </div>

        <div>
          <label htmlFor="lib-tech" className="mb-1 block text-xs font-medium text-zinc-300">
            {t("technology")}
          </label>
          <select id="lib-tech" value={tech} onChange={(e) => setTech(e.target.value)} className={selectCls}>
            <option value="">{t("allFeminine")}</option>
            {technologies.map((slug) => (
              <option key={slug} value={slug}>
                {techLabel(slug, locale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lib-type" className="mb-1 block text-xs font-medium text-zinc-300">
            {t("type")}
          </label>
          <select id="lib-type" value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="">{t("all")}</option>
            {resourceTypes.map((v) => (
              <option key={v} value={v}>
                {tTypes(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lib-level" className="mb-1 block text-xs font-medium text-zinc-300">
            {t("level")}
          </label>
          <select id="lib-level" value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
            <option value="">{t("all")}</option>
            {resourceLevels.map((v) => (
              <option key={v} value={v}>
                {tLevels(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lib-status" className="mb-1 block text-xs font-medium text-zinc-300">
            {t("status")}
          </label>
          <select
            id="lib-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | ResourceStatus)}
            className={selectCls}
          >
            <option value="">{t("all")}</option>
            {resourceStatuses.map((v) => (
              <option key={v} value={v}>
                {tStatus(v)}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="sm:col-span-2 lg:col-span-6">
          <legend className="mb-1 text-xs font-medium text-zinc-300">{t("language")}</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["both", t("languageBoth")],
                ["pt-BR", t("languagePt")],
                ["en", t("languageEn")],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-200 has-[:checked]:border-library has-[:checked]:bg-library/15 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hub"
              >
                <input
                  type="radio"
                  name="lib-language"
                  value={value}
                  checked={language === value}
                  onChange={() => setPreference("libraryLanguage", value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="flex items-center justify-between gap-4">
        <p role="status" className="font-mono text-sm text-zinc-300">
          {t("results", { count: filtered.length })}
        </p>
        {hasFilters && (
          <button type="button" onClick={clear} className="text-sm text-library underline underline-offset-2 hover:text-white">
            {t("clear")}
          </button>
        )}
      </div>

      {/* título só para leitores de tela: os cards (h3) ficam dentro de uma seção com h2 */}
      <h2 className="sr-only">{t("resultsHeading")}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <li key={r.id}>
            <ResourceCard resource={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}
