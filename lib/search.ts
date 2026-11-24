import { getProjects, getResources, getTracks } from "./content";
import { tr } from "./schemas";

export type SearchItem = {
  id: string;
  kind: "track" | "project" | "step" | "resource";
  title: string;
  subtitle: string;
  /** rota interna sem prefixo de idioma, ou URL externa */
  href: string;
  external: boolean;
  keywords: string;
};

/** Índice de busca já traduzido para o idioma atual (montado no servidor) */
export function buildSearchIndex(locale: string): SearchItem[] {
  const tracks = getTracks();
  const trackName = (id: string) => {
    const t = tracks.find((x) => x.id === id);
    return t ? tr(t.name, locale) : id;
  };

  const items: SearchItem[] = [];

  for (const t of tracks) {
    items.push({
      id: `track:${t.id}`,
      kind: "track",
      title: tr(t.name, locale),
      subtitle: tr(t.tagline, locale),
      href: `/tracks/${t.id}`,
      external: false,
      keywords: t.id,
    });
  }

  for (const p of getProjects()) {
    items.push({
      id: `project:${p.id}`,
      kind: "project",
      title: tr(p.title, locale),
      subtitle: trackName(p.track),
      href: `/tracks/${p.track}/${p.id}`,
      external: false,
      keywords: p.stack.join(" "),
    });
    p.steps.forEach((s, i) => {
      items.push({
        id: `step:${p.id}:${s.id}`,
        kind: "step",
        title: `${i + 1}. ${tr(s.title, locale)}`,
        subtitle: tr(p.title, locale),
        href: `/tracks/${p.track}/${p.id}#step-${s.id}`,
        external: false,
        keywords: tr(s.goal, locale),
      });
    });
  }

  for (const r of getResources()) {
    items.push({
      id: `resource:${r.id}`,
      kind: "resource",
      title: r.title,
      subtitle: `${r.author} · ${r.language === "pt-BR" ? "PT-BR" : "EN"}`,
      href: r.url,
      external: true,
      keywords: `${r.technologies.join(" ")} ${tr(r.description, locale)}`,
    });
  }

  return items;
}
