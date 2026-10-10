/** @vitest-environment jsdom */
/**
 * Canvas accessibility + focus contracts.
 *
 * jsdom-level proof for the keyboard/focus half of TASK 14 (the Playwright
 * spec in e2e/ covers the same contracts against a real browser).
 */
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_PERSONAL_SITE,
  emptySection,
  type PersonalSiteInput,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";
import { FloatingContextToolbar, type TypographyState } from "./floating-context-toolbar";

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

/** Site whose home page holds the given sections (canonical + legacy mirrors). */
function siteWith(sections: PersonalSiteSection[]): PersonalSiteInput {
  const home = DEFAULT_PERSONAL_SITE.pages?.[0] ?? {
    id: "home",
    slug: "",
    title: "Home",
    isHome: true,
    sections: [],
  };
  return {
    ...DEFAULT_PERSONAL_SITE,
    sections,
    pages: [{ ...home, sections }],
  };
}

function renderEditor(initialSite: PersonalSiteInput = DEFAULT_PERSONAL_SITE) {
  return render(
    <main id="main-content">
      <CanvasEditor
        initialSite={initialSite}
        previewUrl="https://example.test/site/my-studio"
        publicSiteBaseUrl="https://example.test"
        onSave={vi.fn(async () => {})}
        canEditSlug
      />
    </main>,
  );
}

/** Hover the innermost canvas wrapper for a section so its action bar mounts. */
function hoverSection(container: HTMLElement, id: string) {
  const nodes = container.querySelectorAll<HTMLElement>(`[data-section-id="${id}"]`);
  fireEvent.mouseEnter(nodes[nodes.length - 1]);
}

const announcer = () => screen.getByTestId("canvas-announcer");

function ToolbarHarness() {
  const [value, setValue] = React.useState<TypographyState>({ bold: false, italic: false, listType: "none" });
  return (
    <FloatingContextToolbar
      active
      value={value}
      onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  );
}

describe("canvas accessible names and toggle state", () => {
  it("exposes the floating toolbar as a labelled toolbar", () => {
    render(<ToolbarHarness />);
    expect(screen.getByRole("toolbar")).toBeTruthy();
  });

  it("marks formatting toggles with aria-pressed that follows state", async () => {
    render(<ToolbarHarness />);
    const bold = screen.getByRole("button", { name: "Bold" });
    expect(bold.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(bold);
    expect(screen.getByRole("button", { name: "Bold" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("names every icon-only action button", () => {
    render(<ToolbarHarness />);
    for (const name of ["Bold", "Italic", "Underline", "Strikethrough", "Duplicate", "Delete"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("opens the colour popover from the keyboard and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);
    const trigger = screen.getByRole("button", { name: "Text Color" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Select Color")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Select Color")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("canvas live announcements", () => {
  const twoSections = () => {
    const sections = [emptySection("services"), emptySection("custom")];
    return { sections, first: sections[0].id, second: sections[1].id };
  };

  it("announces a duplicated section through a polite live region", async () => {
    const { sections, first } = twoSections();
    const { container } = renderEditor(siteWith(sections));
    hoverSection(container, first);
    await userEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(announcer().textContent).toMatch(/duplicated/i);
  });

  it("announces a deleted section", async () => {
    const { sections, first } = twoSections();
    const { container } = renderEditor(siteWith(sections));
    hoverSection(container, first);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(announcer().textContent).toMatch(/deleted/i);
  });

  it("announces a reordered section", async () => {
    const { sections, second } = twoSections();
    const { container } = renderEditor(siteWith(sections));
    hoverSection(container, second);
    await userEvent.click(screen.getByRole("button", { name: "Move up" }));
    expect(announcer().textContent).toMatch(/moved/i);
  });

  it("announces the section limit instead of relying on a toast", async () => {
    const sections = Array.from({ length: 12 }, (_, i) => ({ ...emptySection("custom"), id: `sec-${i}` }));
    const { container } = renderEditor(siteWith(sections));
    hoverSection(container, "sec-0");
    await userEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(announcer().textContent).toMatch(/maximum of 12 sections/i);
  });
});

describe("canvas keyboard + landmarks", () => {
  it("selects a structure row from the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    await user.click(screen.getByRole("tab", { name: /structure/i }));
    const row = container.querySelector<HTMLElement>("[data-section-row]")!;
    row.focus();
    await user.keyboard("{Enter}");
    expect(row.className).toContain("border-primary/60");
  });

  it("keeps exactly one main landmark when mounted in the app shell", () => {
    const { container } = renderEditor();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });

  it("exposes the drag-and-drop keyboard instruction", () => {
    renderEditor();
    expect(screen.getAllByText(/press space/i).length).toBeGreaterThan(0);
  });
});

/**
 * Regression guard for the shared toolbar (Landing/Proposal/Contract/Forms).
 *
 * A bad onMouseDown -> onClick sweep once rewrote the FONT list item's body to
 * open the text-type menu instead of applying the font, and nothing noticed
 * because no test in the repo covered font selection at all. The trigger label
 * only changes when the font actually lands in the value, so it is the honest
 * thing to assert.
 */
describe("floating toolbar font selection", () => {
  it("applies the chosen font instead of toggling another menu", async () => {
    render(<ToolbarHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Inter" }));
    await userEvent.click(
      screen.getByText("Plus Jakarta Sans (Modern Geometric)").closest("button") as HTMLElement,
    );
    expect(screen.getByRole("button", { name: "Plus" })).toBeTruthy();
  });
});
