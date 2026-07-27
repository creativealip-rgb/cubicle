"use client";

import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

export function PortalLanguageSwitch() {
  const { lang, pending } = useT();

  const changeLanguage = (next: "id" | "en") => {
    if (next === lang || pending) return;
    // Browser Cookie API requires assignment; this is intentional, not React state mutation.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `cubiqlo_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <div
      className="inline-flex rounded-lg border bg-background p-0.5"
      role="group"
      aria-label={lang === "en" ? "Portal language" : "Bahasa portal"}
    >
      {(["id", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => changeLanguage(value)}
          aria-pressed={lang === value}
          aria-label={
            value === "id" ? "Gunakan Bahasa Indonesia" : "Use English"
          }
          className={cn(
            "h-7 min-w-8 rounded-md px-2 text-[11px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-50",
            lang === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
