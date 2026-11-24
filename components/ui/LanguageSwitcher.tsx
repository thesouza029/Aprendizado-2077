"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = { pt: "Português", en: "English" };

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={clsx("flex rounded-lg border border-white/15 p-0.5", pending && "opacity-60")}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l === "pt" ? "pt-BR" : "en"}
          aria-label={labels[l]}
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
          className={clsx(
            "rounded-md px-2 py-1 font-mono text-xs font-semibold uppercase transition-colors",
            l === locale ? "bg-hub text-night-950" : "text-zinc-300 hover:text-white",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
