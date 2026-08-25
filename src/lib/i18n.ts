import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";

export type Lang = "id" | "en";

export async function getCurrentLang(defaultLang: Lang = "en"): Promise<Lang> {
  const session = await auth.api.getSession({ headers: await headers() });
  const preferred = session?.user?.preferredLanguage;
  if (preferred === "en" || preferred === "id") return preferred;
  const langCookie = (await cookies()).get("cubiqlo_lang")?.value;
  return langCookie === "en" || langCookie === "id" ? langCookie : defaultLang;
}

export function getLocale(lang: Lang) {
  return lang === "en" ? "en-US" : "id-ID";
}

export function createT(lang: Lang) {
  return (id: string, en: string) => (lang === "en" ? en : id);
}
