"use client";

import { createContext, useContext, useCallback, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export type Lang = "id" | "en";

interface LangContextValue {
  lang: Lang;
  /** Translate helper: t("teks Indonesia", "English text") */
  t: (id: string, en: string) => string;
  /** Persist the chosen language (cookie) and refresh server components. */
  setLang: (next: Lang) => void;
  /** BCP-47 locale string, e.g. "id-ID" / "en-US". */
  locale: string;
  /** True while server components re-render after a language change. */
  pending: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "id",
  t: (id) => id,
  setLang: () => {},
  locale: "id-ID",
  pending: false,
});

/**
 * Provides the active UI language to all client components in the tree.
 * `lang` is resolved on the server (from the `cubiqlo_lang` cookie) and passed
 * down, so the first paint is already correct — no hydration flash.
 */
export function LangProvider({
  lang: serverLang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic client state: flips instantly on click so all client
  // components re-render immediately, while the server catches up via refresh.
  const [lang, setLangState] = useState<Lang>(serverLang);

  // Keep in sync if the server resolves a different value (e.g. after refresh).
  useEffect(() => {
    setLangState(serverLang);
  }, [serverLang]);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return; // no-op if unchanged
      setLangState(next); // instant client UI switch
      document.cookie = `cubiqlo_lang=${next}; path=/; max-age=31536000; samesite=lax`;
      // Wrap refresh in a transition so React coalesces rapid clicks into a
      // single pending render — kills the stale-response race, and exposes
      // `pending` so the toggle can lock itself until the server catches up.
      startTransition(() => {
        router.refresh();
      });
    },
    [router, lang],
  );

  const t = useCallback(
    (id: string, en: string) => (lang === "en" ? en : id),
    [lang],
  );

  const locale = lang === "en" ? "en-US" : "id-ID";

  return (
    <LangContext.Provider value={{ lang, t, setLang, locale, pending: isPending }}>
      {children}
    </LangContext.Provider>
  );
}

/** Access the active language + translate helper inside a client component. */
export function useT() {
  return useContext(LangContext);
}
