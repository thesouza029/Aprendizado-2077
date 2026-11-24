"use client";

import clsx from "clsx";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { SearchItem } from "@/lib/search";

const MAX_RESULTS = 12;

const kindStyles: Record<SearchItem["kind"], string> = {
  track: "text-fundamentos",
  project: "text-web",
  step: "text-backend",
  resource: "text-library",
};

/** Busca global (Ctrl/Cmd + K) sobre trilhas, projetos, etapas e recursos */
export function SearchDialog({ items }: { items: SearchItem[] }) {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 3 },
          { name: "subtitle", weight: 1 },
          { name: "keywords", weight: 1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
      }),
    [items],
  );

  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item) : []),
    [fuse, query],
  );

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    inputRef.current?.select();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (item: SearchItem) => {
    close();
    if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
    else router.push(item.href);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item);
    }
  };

  const kindLabel: Record<SearchItem["kind"], string> = {
    track: t("kindTrack"),
    project: t("kindProject"),
    step: t("kindStep"),
    resource: t("kindResource"),
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:border-white/30 hover:text-white"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65-1.06 1.06-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
        <span>{t("open")}</span>
        <kbd className="hidden rounded border border-white/20 px-1 font-mono text-[10px] text-zinc-400 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t("title")}
        onClose={() => {
          setQuery("");
          setActive(0);
        }}
        onClick={(e) => {
          // clique no fundo (fora do painel) fecha
          if (e.target === dialogRef.current) close();
        }}
        className="panel m-auto mt-[10vh] w-[min(40rem,calc(100%-2rem))] p-0 text-zinc-100"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label={t("title")}
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            className="w-full bg-transparent py-4 text-base outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={close}
            className="rounded border border-white/15 px-2 py-0.5 font-mono text-xs text-zinc-400 hover:text-white"
          >
            <span className="sr-only">{tc("close")}</span>
            <span aria-hidden>Esc</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() && <p className="px-3 py-6 text-center text-sm text-zinc-400">{t("hint")}</p>}
          {query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-zinc-400" role="status">
              {t("empty", { query })}
            </p>
          )}
          <ul id={listId} role="listbox" aria-label={t("results")}>
            {results.map((item, i) => {
              const content = (
                <>
                  <span className={clsx("w-20 shrink-0 font-mono text-[11px] uppercase", kindStyles[item.kind])}>
                    {kindLabel[item.kind]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-50">{item.title}</span>
                    <span className="block truncate text-xs text-zinc-400">{item.subtitle}</span>
                  </span>
                </>
              );
              const cls = clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2",
                i === active ? "bg-white/10" : "hover:bg-white/5",
              );
              return (
                <li
                  key={item.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                >
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={close} tabIndex={-1}>
                      {content}
                      <span className="sr-only">{tc("opensInNewTab")}</span>
                    </a>
                  ) : (
                    <Link href={item.href} className={cls} onClick={close} tabIndex={-1}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
