"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n-client";
import type { Lang } from "@/lib/i18n";

export function LandingLanguageSwitch({ initialLang }: { initialLang: Lang }) {
  const { pending, setLang } = useT();
  const [lang, setLandingLang] = useState<Lang>(initialLang);
  const changeLanguage = (next: Lang) => {
    setLandingLang(next);
    setLang(next);
  };
  return (
    <div className="inline-flex items-center rounded-xl bg-white p-1 text-xs shadow-sm ring-1 ring-slate-200" aria-label="Language">
      <button type="button" disabled={pending} onClick={() => changeLanguage("en")} className={`rounded-lg px-2.5 py-1.5 font-semibold ${lang === "en" ? "bg-[#292D34] text-white" : "text-slate-500"}`}>EN</button>
      <button type="button" disabled={pending} onClick={() => changeLanguage("id")} className={`rounded-lg px-2.5 py-1.5 font-semibold ${lang === "id" ? "bg-[#292D34] text-white" : "text-slate-500"}`}>ID</button>
    </div>
  );
}
