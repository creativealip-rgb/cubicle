import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSiteRenderer } from "@/components/site/personal-site-renderer";
import { getPersonalSiteForCurrentOwner, getSuggestedPersonalSiteDefaults } from "@/lib/actions/personal-site";
import { createT, getCurrentLang } from "@/lib/i18n";
import { requireAppSession } from "@/lib/app-auth";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Landing Page Preview",
  robots: { index: false, follow: false },
};

export default async function PersonalSitePreviewPage() {
  await requireAppSession("/site/preview");
  await requireWorkspaceOwnerOrRedirect();
  const [site, lang] = await Promise.all([getPersonalSiteForCurrentOwner(), getCurrentLang()]);
  const data = site ?? await getSuggestedPersonalSiteDefaults();
  if (!data) notFound();
  const t = createT(lang);
  return <PersonalSiteRenderer site={data} labels={{
    about: t("Tentang", "About"),
    workWithMe: t("Mari bekerja sama", "Work with me"),
    contactHint: t("Pilih cara menghubungi atau lihat portfolio di bawah.", "Choose a contact or portfolio link below."),
    contact: t("Hubungi Saya", "Contact me"),
    openProject: t("Buka project", "Open project"),
    pageNav: t("Halaman situs", "Site pages"),
  }} />;
}
