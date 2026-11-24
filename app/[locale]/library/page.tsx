import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryBrowser } from "@/components/ui/LibraryBrowser";
import { LIBRARY_COLOR, getResources } from "@/lib/content";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: `${t("eyebrow")} · ${t("title")}`, description: t("subtitle") };
}

/** Arquivo Neon (Biblioteca) */
export default async function LibraryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("library");

  return (
    <div
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:py-14"
      style={{ "--accent": LIBRARY_COLOR } as CSSProperties}
    >
      <header className="max-w-3xl">
        <p className="accent-text font-mono text-sm uppercase tracking-[0.3em]">{t("eyebrow")}</p>
        <h1 className="font-display neon-text accent-text mt-3 text-4xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-lg text-zinc-300">{t("subtitle")}</p>
      </header>
      {/* useSearchParams (filtros vindos da URL) exige Suspense na renderização estática */}
      <Suspense fallback={null}>
        <LibraryBrowser resources={getResources()} />
      </Suspense>
    </div>
  );
}
