import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-library">404</p>
      <h1 className="font-display neon-text mt-2 text-4xl font-bold text-hub">{t("title")}</h1>
      <p className="mt-4 text-zinc-300">{t("text")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-hub/50 px-5 py-2.5 font-medium text-hub hover:bg-hub/10"
      >
        {t("back")}
      </Link>
    </div>
  );
}
