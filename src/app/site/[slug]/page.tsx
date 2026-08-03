import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSiteRenderer } from "@/components/site/personal-site-renderer";
import { getPublishedPersonalSiteBySlug } from "@/lib/actions/personal-site";
import { createT, getCurrentLang } from "@/lib/i18n";
import { generatePersonalSiteMetadata } from "@/lib/personal-site/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedPersonalSiteBySlug(slug);
  if (!site) return { title: "Site not found" };
  return generatePersonalSiteMetadata(site);
}

export default async function PublicPersonalSitePage({ params }: Props) {
  const { slug } = await params;
  const [site, lang] = await Promise.all([
    getPublishedPersonalSiteBySlug(slug),
    getCurrentLang(),
  ]);
  if (!site) notFound();
  const t = createT(lang);
  return <PersonalSiteRenderer site={site} labels={{
    about: t("Tentang", "About"),
    workWithMe: t("Mari bekerja sama", "Work with me"),
    contactHint: t("Pilih cara menghubungi atau lihat portfolio di bawah.", "Choose a contact or portfolio link below."),
  }} />;
}
