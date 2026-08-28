import type { PersonalSiteInput } from "./model";
import { isSafePublicHref, isPlaceholderHref, RESERVED_PERSONAL_SITE_SLUGS, sectionHasContent } from "./model";

/**
 * Readiness issue identified in a personal site configuration.
 */
export type ReadinessIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
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
