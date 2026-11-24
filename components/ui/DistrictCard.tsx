import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import type { ProjectSummary } from "@/lib/content";
import { ProgressMeter } from "./ProgressMeter";

type Props = {
  href: string;
  color: string;
  name: string;
  tagline: string;
  meta: string;
  badge?: string;
  /** projetos do distrito, para a barra de progresso (biblioteca não tem) */
  projects?: ProjectSummary[];
};

/** Card de distrito no modo 2D: equivale a um bairro da cidade 3D */
export function DistrictCard({ href, color, name, tagline, meta, badge, projects }: Props) {
  return (
    <Link
      href={href}
      style={{ "--accent": color } as CSSProperties}
      className="panel accent-border group relative flex h-full flex-col gap-3 overflow-hidden p-5 transition-transform hover:-translate-y-0.5 hover:accent-glow focus-visible:accent-glow"
    >
      <span aria-hidden className="accent-bar absolute inset-x-0 top-0 h-0.5 opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display accent-text text-lg font-semibold tracking-wide">{name}</h3>
        {badge && (
          <span className="accent-soft accent-text shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold uppercase">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{tagline}</p>
      <div className="mt-auto space-y-2 pt-2">
        <p className="font-mono text-xs text-zinc-400">{meta}</p>
        {projects && projects.length > 0 && <ProgressMeter projects={projects} label={name} showCount={false} />}
      </div>
    </Link>
  );
}
