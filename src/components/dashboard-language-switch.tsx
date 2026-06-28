"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DashboardLanguageSwitch({ lang }: { lang: "id" | "en" }) {
  const router = useRouter();
  function setLang(next: "id" | "en") {
    document.cookie = `cubiqlo_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <div className="flex items-center rounded-lg border bg-white p-1 text-xs">
      <Button size="sm" variant={lang === "id" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setLang("id")}>ID</Button>
      <Button size="sm" variant={lang === "en" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setLang("en")}>EN</Button>
    </div>
  );
}
