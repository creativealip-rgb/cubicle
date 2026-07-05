import { cookies } from "next/headers";

export type Lang = "id" | "en";

export async function getCurrentLang(): Promise<Lang> {
  const langCookie = (await cookies()).get("cubiqlo_lang")?.value;
  return langCookie === "en" ? "en" : "id";
}

export function getLocale(lang: Lang) {
  return lang === "en" ? "en-US" : "id-ID";
}

export function createT(lang: Lang) {
  return (id: string, en: string) => (lang === "en" ? en : id);
}
