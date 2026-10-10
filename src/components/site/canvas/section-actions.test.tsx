/**
 * Destructive-action safety for landing sections.
 *
 * Deleting a section that still holds user content must go through the
 * controlled ConfirmDialog (never window.confirm); a still-empty section —
 * one straight out of `emptySection()` — is removed immediately. Mobile
 * exposes the same duplicate action as the desktop canvas.
 *
 * Mounted inside an AppShell-like `<main>` because that is how
 * `/app/personal-site` renders the editor.
 */
/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_PERSONAL_SITE,
  type PersonalSiteInput,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";
import { MAX_PAGES, MAX_SECTIONS, isSectionEmpty } from "@/lib/personal-site/editor-mutations";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: toastError } }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/app/personal-site",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

import { CanvasEditor } from "./canvas-editor";
import { MobileStepEditor } from "./mobile-step-editor";

const DELETE_TITLE = "Delete this section?";
const CONFIRM_LABEL = "Delete Section";

function makeSite(sections: PersonalSiteSection[]): PersonalSiteInput {
  return {
    ...DEFAULT_PERSONAL_SITE,
    sections,
    pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections }],
  };
}

function renderEditor(site: PersonalSiteInput) {
  return render(
    <main id="main-content">
      <CanvasEditor
        initialSite={site}
        previewUrl="https://example.test/site/my-studio"
        publicSiteBaseUrl="https://example.test"
        onSave={vi.fn(async () => {})}
        canEditSlug
      />
    </main>,
  );
}

async function selectFirstSection(container: HTMLElement) {
  await userEvent.click(screen.getByRole("tab", { name: /structure/i }));
  const rows = container.querySelectorAll("[data-section-row]");
  fireEvent.click(rows[0]);
}

const sectionRows = (container: HTMLElement) => container.querySelectorAll("[data-section-row]");

describe("isSectionEmpty", () => {
  it("treats a freshly created emptySection() as empty", () => {
    // Exactly the shape `emptySection("custom")` produces.
    expect(isSectionEmpty({ id: "s1", type: "custom", heading: "Section", content: "" })).toBe(true);
  });

  it("treats a section with user text as non-empty", () => {
    expect(isSectionEmpty(DEFAULT_PERSONAL_SITE.sections[0])).toBe(false);
  });

  it("treats a renamed-but-unfilled section as non-empty", () => {
    expect(isSectionEmpty({ id: "s2", type: "custom", heading: "My Block", content: "" })).toBe(false);
  });
});

describe("desktop section delete safety", () => {
  beforeEach(() => toastError.mockClear());

  it("asks for confirmation before deleting a section with content", async () => {
    const { container } = renderEditor(DEFAULT_PERSONAL_SITE);
    await selectFirstSection(container);

    await userEvent.click(screen.getByRole("button", { name: /Delete This Section/i }));

    expect(screen.getByText(DELETE_TITLE)).toBeTruthy();
    // Still there until confirmed.
    expect(sectionRows(container)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_LABEL }));
    await waitFor(() => expect(sectionRows(container)).toHaveLength(1));
    expect(screen.queryByText(DELETE_TITLE)).toBeNull();
  });

  it("deletes an empty section without prompting, and undo restores it", async () => {
    const empty: PersonalSiteSection = { id: "s-empty-1", type: "custom", heading: "Section", content: "" };
    const { container } = renderEditor(makeSite([empty]));
    await selectFirstSection(container);

    await userEvent.click(screen.getByRole("button", { name: /Delete This Section/i }));

    expect(screen.queryByText(DELETE_TITLE)).toBeNull();
    await waitFor(() => expect(sectionRows(container)).toHaveLength(0));

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(sectionRows(container)).toHaveLength(1));
  });

  it("announces the max-limit when adding to a full page", async () => {
    const full = Array.from({ length: MAX_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      type: "custom" as const,
      heading: `Block ${i}`,
      content: "x",
    }));
    renderEditor(makeSite(full));
    toastError.mockClear();

    await userEvent.click(screen.getAllByRole("button", { name: /^Add Section$/i })[0]);

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain(String(MAX_SECTIONS));
  });
});

describe("mobile section parity", () => {
  beforeEach(() => toastError.mockClear());

  function renderMobile(site: PersonalSiteInput, onUpdateSite = vi.fn()) {
    render(
      <MobileStepEditor
        site={site}
        activePageId="home"
        selectedSectionId={null}
        publicSiteBaseUrl="https://example.test"
        previewUrl="https://example.test/preview"
        onUpdateSite={onUpdateSite}
        onSetActivePageId={vi.fn()}
        onSelectSection={vi.fn()}
        canEditSlug
      />,
    );
    return onUpdateSite;
  }

  it("exposes a duplicate action that copies the section", async () => {
    const onUpdateSite = renderMobile(makeSite(DEFAULT_PERSONAL_SITE.sections));
    // The mobile surface is canvas-first: the section list lives behind the
    // Structure drawer rather than a wizard step.
    await userEvent.click(screen.getByRole("button", { name: "Structure" }));

    await userEvent.click(screen.getAllByRole("button", { name: /Duplicate section/i })[0]);

    expect(onUpdateSite).toHaveBeenCalled();
    const patch = onUpdateSite.mock.calls.at(-1)?.[0] as Partial<PersonalSiteInput>;
    const sections = patch.pages?.[0]?.sections ?? [];
    expect(sections).toHaveLength(3);
    expect(sections[1].heading).toContain("(copy)");
  });

  it("announces the max-limit when adding to a full page", async () => {
    const full = Array.from({ length: MAX_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      type: "custom" as const,
      heading: `Block ${i}`,
      content: "x",
    }));
    renderMobile(makeSite(full));
    // Templates are added from the Elements drawer; Structure only lists and
    // reorders what already exists.
    await userEvent.click(screen.getByRole("button", { name: "Elements" }));
    toastError.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /Three Service Cards/i }));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain(String(MAX_SECTIONS));
  });

  function pagesOf(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i === 0 ? "home" : `p${i}`,
      slug: i === 0 ? "" : `p${i}`,
      title: `Page ${i}`,
      isHome: i === 0,
      sections: [],
    }));
  }

  async function clickAddPage() {
    await userEvent.click(screen.getByRole("button", { name: "Elements" }));
    toastError.mockClear();
    await userEvent.click(screen.getByRole("button", { name: /Add Page/i }));
  }

  it("announces the max-limit at the page cap and adds nothing", async () => {
    const onUpdateSite = renderMobile({ ...DEFAULT_PERSONAL_SITE, sections: [], pages: pagesOf(MAX_PAGES) });

    await clickAddPage();

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain(String(MAX_PAGES));
    expect(onUpdateSite).not.toHaveBeenCalled();
  });

  it("adds a page below the cap without announcing a limit", async () => {
    const onUpdateSite = renderMobile({ ...DEFAULT_PERSONAL_SITE, sections: [], pages: pagesOf(1) });

    await clickAddPage();

    expect(toastError).not.toHaveBeenCalled();
    expect(onUpdateSite).toHaveBeenCalled();
    const patch = onUpdateSite.mock.calls.at(-1)?.[0] as Partial<PersonalSiteInput>;
    expect(patch.pages).toHaveLength(2);
  });
});
