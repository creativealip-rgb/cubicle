import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const docsDir = join(process.cwd(), "src/app/(app)/app/docs");

const source = (name: string) => readFileSync(join(docsDir, name), "utf8");

const shellComponents = [
  "DocsBreadcrumb",
  "DocsHero",
  "DocsLayout",
  "DocsSection",
  "DocsCallout",
];

describe("docs pages use the shared docs shell", () => {
  const routes = [
    "page.tsx",
    "getting-started/page.tsx",
    "landing-page/page.tsx",
    "invoice/page.tsx",
    "workspace-settings/page.tsx",
    "[slug]/page.tsx",
  ];

  for (const route of routes) {
    it(`${route} imports the docs shell`, () => {
      const text = source(route);
      expect(text).toContain('from "@/components/docs/doc-shell"');
    });
  }

  // Index is a card grid; article pages carry hero + layout + TOC.
  const articleRoutes = [
    "getting-started/page.tsx",
    "landing-page/page.tsx",
    "invoice/page.tsx",
    "workspace-settings/page.tsx",
    "[slug]/page.tsx",
  ];

  for (const route of articleRoutes) {
    it(`${route} uses DocsHero and DocsLayout`, () => {
      const text = source(route);
      expect(text).toContain("<DocsHero");
      expect(text).toContain("<DocsLayout");
    });

    it(`${route} passes a toc to DocsLayout`, () => {
      const text = source(route);
      expect(text).toMatch(/<DocsLayout\s+toc=/);
    });
  }

  it("index page uses DocsCard for guide links", () => {
    const text = source("page.tsx");
    expect(text).toContain("<DocsCard");
  });
});

describe("docs pages keep billing copy aligned with active models", () => {
  // Canonical docs: Fixed Price / Per Jam (Hourly) / Retainer. No "Paket" as a
  // project billing type — package remains only as subscription plan (workspace-settings).
  const billingRoutes = [
    "page.tsx",
    "invoice/page.tsx",
    "getting-started/page.tsx",
    "[slug]/page.tsx",
  ];

  for (const route of billingRoutes) {
    it(`${route} does not list Paket/Package as a project billing model`, () => {
      const text = source(route);
      expect(text).not.toMatch(/tipe billing[^.]*\bPaket\b/i);
      expect(text).not.toMatch(/billing type[^.]*\bPackage\b/i);
      expect(text).not.toMatch(/Fixed Price \/ Per Jam \/ Retainer \/ Paket/);
    });
  }

  it("workspace-settings keeps subscription plans (Solo/Team) as billing copy", () => {
    const text = source("workspace-settings/page.tsx");
    // Subscription plan copy must come from the shared exact-price helpers
    // (yearly Solo Rp 900.000 / Team Rp 1.980.000), not hardcoded
    // abbreviated prices that can drift from the checkout catalog.
    expect(text).toContain("getPlanYearlyLabel(BILLING_PLANS.solo)");
    expect(text).toContain("getPlanYearlyLabel(BILLING_PLANS.team)");
    expect(text).not.toMatch(/Rp\s*\d+rb|Rp\s*[\d.,]+jt|588|1,188|1\.188/);
  });
});

describe("docs shell exports", () => {
  it("doc-shell.tsx exports all layout primitives", () => {
    const text = readFileSync(join(process.cwd(), "src/components/docs/doc-shell.tsx"), "utf8");
    for (const component of shellComponents) {
      expect(text).toContain(`export function ${component}`);
    }
    expect(text).toContain("export function DocsCard");
  });
});
