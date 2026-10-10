import type { PersonalSiteInput, PersonalSiteSection } from "./model";
import { isSafePublicHref, isPlaceholderHref, isSafeEmbedUrl, RESERVED_PERSONAL_SITE_SLUGS, sectionHasContent } from "./model";

/**
 * Readiness issue identified in a personal site configuration.
 */
export type ReadinessIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
};

/**
 * What an empty block means for publishing, per block type. Exhaustive so a new
 * section type must be classified deliberately rather than defaulting silently.
 *
 * - `error`: the storage schema rejected blank content here, so no published
 *   site can contain an empty one — flagging it keeps that guarantee now that
 *   drafts may save incomplete.
 * - `warning`: always savable while empty, so treating it as an error would
 *   newly block sites that publish today.
 * - `never`: `sectionHasContent` returns true by design; nothing to flag.
 */
const EMPTY_BLOCK_SEVERITY: Record<PersonalSiteSection["type"], "error" | "warning" | "never"> = {
  services: "error",
  process: "error",
  pricing: "error",
  portfolio: "error",
  testimonials: "error",
  faq: "error",
  contact: "error",
  collapsible: "error",
  booking: "error",
  image: "warning",
  gallery: "warning",
  embed: "warning",
  custom: "warning",
  mediaText: "warning",
  cta: "warning",
  social: "warning",
  contentBlock: "warning",
  divider: "never",
  spacer: "never",
  tableOfContents: "never",
};

/**
 * Evaluates a PersonalSiteInput for publish-readiness.
 * Returns issues that should be addressed before publishing.
 * 
 * Checks:
 * - Slug valid and non-reserved
 * - Title filled
 * - Hero filled
 * - CTA label + URL paired when published
 * - At least one contact link or CTA URL exists anywhere
 * - At least one content-bearing section across pages (including home)
 * - themeConfig exists (for styling consistency)
 * 
 * @param site - The personal site configuration to validate
 * @returns Array of ReadinessIssue with user-friendly Indonesian labels
 */
export function getPersonalSiteReadiness(site: PersonalSiteInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  // Check slug validity
  if (!site.slug || site.slug.trim().length === 0) {
    issues.push({
      id: "slug-empty",
      severity: "error",
      label: "Slug tidak boleh kosong",
    });
  } else if (site.slug.length < 2 || site.slug.length > 48) {
    issues.push({
      id: "slug-length",
      severity: "error",
      label: "Slug harus antara 2-48 karakter",
    });
  } else {
    // Basic pattern check - lowercase, numbers, hyphens only
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(site.slug)) {
      issues.push({
        id: "slug-pattern",
        severity: "error",
        label: "Slug hanya boleh huruf kecil, angka, dan tanda hubung",
      });
    }
  }

  // Reserved slug check (guard nullish slug, already validated by schema when present)
  if (site.slug && RESERVED_PERSONAL_SITE_SLUGS.has(site.slug.toLowerCase())) {
    issues.push({
      id: "slug-reserved",
      severity: "error",
      label: "Slug ini dicadangkan untuk sistem Cubiqlo",
    });
  }

  // Check title
  if (!site.title || site.title.trim().length === 0) {
    issues.push({
      id: "title-empty",
      severity: "error",
      label: "Judul halaman perlu diisi",
    });
  } else if (site.title.trim().length > 100) {
    issues.push({
      id: "title-too-long",
      severity: "warning",
      label: "Judul terlalu panjang (maksimal 100 karakter)",
    });
  }

  // Check hero
  if (!site.hero || site.hero.trim().length === 0) {
    issues.push({
      id: "hero-empty",
      severity: "error",
      label: "Hero deskripsi perlu diisi",
    });
  } else if (site.hero.trim().length > 500) {
    issues.push({
      id: "hero-too-long",
      severity: "warning",
      label: "Hero terlalu panjang (maksimal 500 karakter)",
    });
  }

  // Check themeConfig exists
  if (!site.themeConfig || Object.keys(site.themeConfig).length === 0) {
    issues.push({
      id: "theme-config-missing",
      severity: "warning",
      label: "Konfigurasi tema belum diatur (warna header mungkin tidak sesuai)",
    });
  }

  // When published, check CTA pairing and contact presence
  if (site.published) {
    // CTA label + URL should be paired
    const hasCtaLabel = site.ctaLabel && site.ctaLabel.trim().length > 0;
    const hasCtaUrl = site.ctaUrl && site.ctaUrl.trim().length > 0;
    
    if (hasCtaLabel && hasCtaUrl) {
      // Validate CTA URL is safe
      const url = site.ctaUrl!.trim();
      if (!isSafePublicHref(url)) {
        issues.push({
          id: "cta-url-invalid",
          severity: "error",
          label: "URL CTA menggunakan protokol yang tidak aman",
        });
      } else if (isPlaceholderHref(url)) {
        issues.push({
          id: "placeholder-example-destination",
          severity: "error",
          label: "URL CTA masih memakai contoh (example.com / hello@example.com) — ganti dengan alamat asli",
        });
      }
    }

    // Unsafe URLs in other URL-bearing section fields (social links, embed
    // sources) are publish blockers too. The storage schema deliberately stays
    // permissive — an already-saved document must never fail validation on
    // autosave — so the refusal lives in this publish gate, not in Zod.
    const publishedSections = [
      ...(site.pages ?? []).flatMap((page) => page.sections),
      ...(site.sections ?? []),
    ];
    if (publishedSections.some((section) => section.type === "social" && section.links.some((link) => Boolean(link.url) && !isSafePublicHref(link.url)))) {
      issues.push({
        id: "social-link-invalid",
        severity: "error",
        label: "Salah satu tautan sosial memakai protokol yang tidak aman (hanya http/https, mailto, atau tel yang diizinkan)",
      });
    }
    if (publishedSections.some((section) => section.type === "embed" && Boolean(section.url) && !isSafeEmbedUrl(section.url))) {
      issues.push({
        id: "embed-url-invalid",
        severity: "error",
        label: "URL embed tidak aman — hanya alamat http(s) yang boleh ditampilkan di iframe",
      });
    }

  }

  // Content check mirrors the public renderer (PersonalSiteRenderer):
  // - legacy sites without pages render site.sections directly
  // - a page whose sections array is empty falls back to site.sections  
  // Count effective visible sections so readiness never warns about content
  // that the renderer would actually show.
  const pages = site.pages ?? [];
  const topLevelSections = site.sections ?? [];

  let hasContentSection = false;
  if (pages.length === 0) {
    // Legacy site: everything renders from top-level sections
    hasContentSection = topLevelSections.some(sectionHasContent);
  } else {
    // Page-based site: each page either shows its own sections or falls back
    // to top-level sections if its sections array is empty. Check all of those.
    for (const page of pages) {
      const visibleSections = page.sections.length > 0 ? page.sections : topLevelSections;
      if (visibleSections.some(sectionHasContent)) {
        hasContentSection = true;
        break;
      }
    }
  }

  if (!hasContentSection) {
    issues.push({
      id: "no-content-sections",
      severity: "warning",
      label: "Semua halaman masih kosong — tambahkan setidaknya satu bagian yang memiliki konten",
    });
  }

  // An empty block is invisible on the public page (the renderer filters it via
  // `sectionHasContent`), so flag it and tell the user why.
  //
  // Severity comes from `EMPTY_BLOCK_SEVERITY`, see the table above.
  const flaggedEmptySectionIds = new Set<string>();
  // The ordinal restarts on every page, so name the page once a site has more
  // than one — otherwise two blocks on different pages both read "Bagian 1".
  const flagEmptyBlock = (section: PersonalSiteSection, index: number, pageTitle?: string) => {
    const severity = EMPTY_BLOCK_SEVERITY[section.type];
    if (severity === "never") return;
    if (sectionHasContent(section)) return;
    if (flaggedEmptySectionIds.has(section.id)) return;
    flaggedEmptySectionIds.add(section.id);
    issues.push({
      id: `section-empty-${section.id}`,
      severity,
      label: `Bagian ${index + 1}${pageTitle ? ` di halaman "${pageTitle}"` : ""} belum punya konten sehingga tidak akan tampil di halaman publik`,
    });
  };

  // A meaningful image needs a text alternative unless the author marks it
  // decorative. Same split as the URL checks above — the storage schema stays
  // permissive so an autosave never fails, and the refusal lives in this gate.
  const imageNeedsAlt = (section: PersonalSiteSection): boolean => {
    if (section.type === "image") return Boolean(section.url?.trim());
    if (section.type === "mediaText") return Boolean(section.imageUrl?.trim());
    if (section.type === "gallery") return section.images.some((img) => Boolean(img.url.trim()));
    return false;
  };
  // Mirrors the renderer fallbacks: gallery images may fall back to their title.
  const sectionHasAlt = (section: PersonalSiteSection): boolean => {
    if (section.type === "image") return Boolean(section.alt?.trim()) || section.decorative === true;
    if (section.type === "mediaText") return Boolean(section.imageAlt?.trim()) || section.decorative === true;
    if (section.type === "gallery") return section.images.every((img) => Boolean(img.alt?.trim() || img.title?.trim()) || img.decorative === true);
    return true;
  };
  const flagMissingImageAlt = (section: PersonalSiteSection, index: number, pageTitle?: string) => {
    if (!imageNeedsAlt(section) || sectionHasAlt(section)) return;
    issues.push({
      id: `image-alt-${section.id}`,
      severity: "error",
      label: `Bagian ${index + 1}${pageTitle ? ` di halaman "${pageTitle}"` : ""} punya gambar tanpa teks alternatif — isi "Teks alternatif" atau tandai gambar sebagai dekoratif`,
    });
  };

  const visibleSectionGroups = pages.length === 0
    ? [{ title: undefined as string | undefined, sections: topLevelSections }]
    : pages.map((page) => ({
        title: pages.length > 1 ? page.title : undefined,
        sections: page.sections.length > 0 ? page.sections : topLevelSections,
      }));
  for (const group of visibleSectionGroups) {
    group.sections.forEach((section, index) => {
      flagEmptyBlock(section, index, group.title);
      flagMissingImageAlt(section, index, group.title);
    });
  }

  // Home page check only applies to page-based sites; the renderer
  // synthesizes a home page for legacy pages-less sites.
  if (pages.length > 0 && !pages.some((page) => page.isHome)) {
    issues.push({
      id: "no-home-page",
      severity: "warning",
      label: "Buat halaman beranda agar pengunjung punya titik masuk utama",
    });
  }

  return issues;
}


/**
 * Helper to check if an issue list indicates full readiness.
 * Ready = no errors, warnings are acceptable.
 * 
 * @param issues - Issues from getPersonalSiteReadiness
 * @returns true if ready to publish
 */
export function isReadyToPublish(issues: ReadinessIssue[]): boolean {
  return issues.every((issue) => issue.severity === "warning");
}

/**
 * Count errors vs warnings separately.
 */
export function countReadinessIssues(issues: ReadinessIssue[]): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors++;
    else warnings++;
  }
  return { errors, warnings };
}
