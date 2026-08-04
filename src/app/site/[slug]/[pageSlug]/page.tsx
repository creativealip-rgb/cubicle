import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSiteRenderer } from "@/components/site/personal-site-renderer";
import { getPublishedPersonalSiteBySlug } from "@/lib/actions/personal-site";
import { createT, getCurrentLang } from "@/lib/i18n";
import { generatePersonalSiteSubPageMetadata } from "@/lib/personal-site/metadata";

type Props = { params: Promise<{ slug: string; pageSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const site = await getPublishedPersonalSiteBySlug(slug);
  if (!site) return { title: "Site not found" };
  const page = site.pages?.find((item) => item.slug === pageSlug);
  if (!page) return { title: "Site page not found" };
  return generatePersonalSiteSubPageMetadata(site, pageSlug);
}

export default async function PublicPersonalSiteSubPage({ params }: Props) {
  const { slug, pageSlug } = await params;
  const [site, lang] = await Promise.all([
    getPublishedPersonalSiteBySlug(slug),
    getCurrentLang(),
  ]);
  if (!site || !site.pages?.some((page) => page.slug === pageSlug)) notFound();
  const t = createT(lang);
  return <PersonalSiteRenderer site={site} activePageSlug={pageSlug} labels={{
    about: t("Tentang", "About"),
    workWithMe: t("Mari bekerja sama", "Work with me"),
    contactHint: t("Pilih cara menghubungi atau lihat portfolio di bawah.", "Choose a contact or portfolio link below."),
  }} />;
}
