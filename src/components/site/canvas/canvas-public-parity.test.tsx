/**
 * Canvas ↔ public parity for URL-bearing fields.
 *
 * The canvas deliberately differs from the public page in one way: while editing,
 * links must not navigate (a stray click would leave the builder mid-edit). What
 * must NOT differ is which destinations are considered safe — both go through
 * `safePublicHref` / `safeEmbedSrc`, and these tests pin that.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CanvasRenderer } from "./canvas-renderer";
import {
  DEFAULT_PERSONAL_SITE,
  emptySection,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";

const SECURE_SOCIAL = "https://instagram.com/acme";
const UNSAFE_URLS = ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)"];

function renderCanvas(sections: PersonalSiteSection[], previewMode: boolean) {
  const noop = vi.fn();
  return renderToStaticMarkup(
    <CanvasRenderer
      site={{ ...DEFAULT_PERSONAL_SITE, sections, ctaLabel: "", ctaUrl: "" }}
      selectedSectionId={null}
      onSelectSection={noop}
      onUpdateSite={noop}
      onUpdateSection={noop}
      onAddSection={noop}
      onMoveSection={noop}
      onDuplicateSection={noop}
      onDeleteSection={noop}
      previewMode={previewMode}
    />,
  );
}

function embedSection(url: string): PersonalSiteSection {
  return { ...emptySection("embed"), heading: "Video", url } as PersonalSiteSection;
}

function socialSection(url: string): PersonalSiteSection {
  return {
    ...emptySection("social"),
    heading: "Find me",
    links: [{ id: "l1", platform: "Instagram", url }],
  } as PersonalSiteSection;
}

describe("canvas embed source", () => {
  it.each(UNSAFE_URLS)("never renders an iframe for %s", (url) => {
    const html = renderCanvas([embedSection(url)], false);
    expect(html).not.toContain("<iframe");
    // The editor says why instead of showing a silently blank frame.
    expect(html).toContain("http(s)");
  });

  it("renders the iframe for an absolute http(s) source", () => {
    const html = renderCanvas([embedSection("https://www.youtube.com/embed/abc")], false);
    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube.com/embed/abc");
  });

  it("refuses a page anchor, which is a valid href but never a valid embed", () => {
    // `#pricing` passes isSafePublicHref but would render an empty frame.
    const html = renderCanvas([embedSection("#pricing")], false);
    expect(html).not.toContain("<iframe");
  });
});

describe("canvas social links", () => {
  it("does not navigate while editing, but still shows the destination", () => {
    const html = renderCanvas([socialSection(SECURE_SOCIAL)], false);
    expect(html).not.toContain(`href="${SECURE_SOCIAL}"`);
    expect(html).toContain(`title="${SECURE_SOCIAL}"`);
  });

  it("navigates in preview mode, matching the public page", () => {
    const html = renderCanvas([socialSection(SECURE_SOCIAL)], true);
    expect(html).toContain(`href="${SECURE_SOCIAL}"`);
  });

  it("keeps an unsafe destination out of the DOM in both modes", () => {
    for (const previewMode of [false, true]) {
      const html = renderCanvas([socialSection("javascript:alert(1)")], previewMode);
      expect(html).not.toContain("javascript:");
    }
  });
});

describe("canvas hero CTA", () => {
  function renderCta(ctaUrl: string, previewMode: boolean) {
    const noop = vi.fn();
    return renderToStaticMarkup(
      <CanvasRenderer
        site={{ ...DEFAULT_PERSONAL_SITE, sections: [], ctaLabel: "Book now", ctaUrl }}
        selectedSectionId={null}
        onSelectSection={noop}
        onUpdateSite={noop}
        onUpdateSection={noop}
        onAddSection={noop}
        onMoveSection={noop}
        onDuplicateSection={noop}
        onDeleteSection={noop}
        previewMode={previewMode}
      />,
    );
  }

  it("is inert in edit mode and navigable in preview mode", () => {
    expect(renderCta("https://cal.com/acme", false)).not.toContain('href="https://cal.com/acme"');
    expect(renderCta("https://cal.com/acme", true)).toContain('href="https://cal.com/acme"');
  });

  it("never emits an unsafe href", () => {
    expect(renderCta("javascript:alert(1)", true)).not.toContain("javascript:");
  });
});
