import { defineRouting } from "next-intl/routing";

export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "pt",
  // Sem prefixo explícito, o idioma vem do navegador (Accept-Language) ou do cookie NEXT_LOCALE.
  localeDetection: true,
});
