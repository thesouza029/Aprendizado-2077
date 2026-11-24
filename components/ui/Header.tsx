import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProjectSummary } from "@/lib/content";
import type { SearchItem } from "@/lib/search";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks } from "./NavLinks";
import { OverallProgress } from "./OverallProgress";
import { SearchDialog } from "./SearchDialog";
import { ViewModeToggle } from "./ViewModeToggle";

type Props = { searchIndex: SearchItem[]; projects: ProjectSummary[] };

/** HUD do modo 2D: logo, navegação, progresso, busca e idioma */
export async function Header({ searchIndex, projects }: Props) {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-[0.2em] text-hub"
          aria-label={`DevCity · ${t("hub")}`}
        >
          <span className="neon-text">DEV</span>
          <span className="neon-text text-library">CITY</span>
        </Link>

        <NavLinks />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <OverallProgress projects={projects} />
          <ViewModeToggle />
          <SearchDialog items={searchIndex} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
