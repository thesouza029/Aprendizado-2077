import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t("localOnly")}{" "}
          <Link href="/#progress" className="text-hub underline underline-offset-2 hover:text-white">
            {t("backup")}
          </Link>
        </p>
        <p>{t("curated")}</p>
      </div>
    </footer>
  );
}
