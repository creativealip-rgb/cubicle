"use client";

import { createContext, useContext, useCallback, useState, useEffect } from "react";
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
}

const LangContext = createContext<LangContextValue>({
  lang: "id",
  t: (id) => id,
  setLang: () => {},
  locale: "id-ID",
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
  // Optimistic client state: flips instantly on click so all client
  // components re-render immediately, while the server catches up via refresh.
  const [lang, setLangState] = useState<Lang>(serverLang);

  // Keep in sync if the server resolves a different value (e.g. after refresh).
  useEffect(() => {
    setLangState(serverLang);
  }, [serverLang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next); // instant UI switch
      document.cookie = `cubiqlo_lang=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh(); // update server components in background
    },
    [router],
  );

  const t = useCallback(
    (id: string, en: string) => (lang === "en" ? en : id),
    [lang],
  );

  const locale = lang === "en" ? "en-US" : "id-ID";

  return (
    <LangContext.Provider value={{ lang, t, setLang, locale }}>
      {children}
    </LangContext.Provider>
  );
}

/** Access the active language + translate helper inside a client component. */
export function useT() {
  return useContext(LangContext);
}
