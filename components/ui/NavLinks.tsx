"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("hub"), active: pathname === "/" || pathname.startsWith("/tracks") },
    { href: "/library", label: t("library"), active: pathname.startsWith("/library") },
  ];

  return (
    <nav aria-label={t("mainNav")} className="order-last w-full sm:order-none sm:w-auto">
      <ul className="flex gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              className={clsx(
                "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                l.active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
