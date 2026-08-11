import { cookies } from "next/headers";

export type Lang = "id" | "en";

export async function getCurrentLang(defaultLang: Lang = "id"): Promise<Lang> {
  const langCookie = (await cookies()).get("cubiqlo_lang")?.value;
  return langCookie === "en" || langCookie === "id" ? langCookie : defaultLang;
}

export function getLocale(lang: Lang) {
  return lang === "en" ? "en-US" : "id-ID";
}

export function createT(lang: Lang) {
  return (id: string, en: string) => (lang === "en" ? en : id);
}
