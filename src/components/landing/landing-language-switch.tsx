"use client";

import { useT } from "@/lib/i18n-client";

export function LandingLanguageSwitch() {
  const { lang, pending, setLang } = useT();
  return (
    <div className="inline-flex items-center rounded-xl bg-white p-1 text-xs shadow-sm ring-1 ring-slate-200" aria-label="Language">
      <button type="button" disabled={pending} onClick={() => setLang("en")} className={`rounded-lg px-2.5 py-1.5 font-semibold ${lang === "en" ? "bg-[#292D34] text-white" : "text-slate-500"}`}>EN</button>
      <button type="button" disabled={pending} onClick={() => setLang("id")} className={`rounded-lg px-2.5 py-1.5 font-semibold ${lang === "id" ? "bg-[#292D34] text-white" : "text-slate-500"}`}>ID</button>
    </div>
  );
}
