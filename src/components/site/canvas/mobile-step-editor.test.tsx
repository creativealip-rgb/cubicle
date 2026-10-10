/**
 * Canvas-first mobile Landing editor (Task 7).
 *
 * These tests run in jsdom, which does NOT do layout: getBoundingClientRect()
 * returns zeros and nothing scrolls. So "390px containment" is asserted on the
 * classes/attributes that PRODUCE containment (`overflow-x-auto` on the toolbar,
 * no fixed pixel width >= the viewport, the canvas capped at max-w-[390px]),
 * not by measuring pixels — a pixel test here could never fail.
 */
/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_PERSONAL_SITE, type PersonalSiteInput } from "@/lib/personal-site/model";
import { MobileStepEditor } from "./mobile-step-editor";

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
// jsdom has no matchMedia; the properties drawer gates on it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function Harness({ initialSite = DEFAULT_PERSONAL_SITE, canEditSlug = true, onUpdateSite = vi.fn() }: {
  initialSite?: PersonalSiteInput;
  canEditSlug?: boolean;
  onUpdateSite?: (patch: Partial<PersonalSiteInput>) => void;
}) {
  const [site, setSite] = useState(initialSite);
  const [activePageId, setActivePageId] = useState("home");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  return (
    <main id="main-content">
      <MobileStepEditor
        site={site}
        activePageId={activePageId}
        selectedSectionId={selectedSectionId}
        publicSiteBaseUrl="https://example.test"
        previewUrl="https://example.test/preview"
        onUpdateSite={(patch) => { onUpdateSite(patch); setSite((s) => ({ ...s, ...patch })); }}
        onSetActivePageId={setActivePageId}
        onSelectSection={setSelectedSectionId}
        canEditSlug={canEditSlug}
      />
    </main>
  );
}

const canvas = () => screen.getByTestId("mobile-landing-canvas");
const toolbar = () => screen.getByTestId("mobile-landing-toolbar");

/**
 * A contenteditable element that actually owns an inline toolbar: only the
 * section headings/items pass `onTypographyChange`, so the hero title (which
 * does not) is the wrong target.
 */
function typographyEditable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[contenteditable="true"]')).find(
    (el) => el.textContent?.trim() === "Services",
  )!;
}

describe("MobileStepEditor slug plan gating", () => {
  it("disables custom slug editing for free plans and links upgrade", () => {
    const source = readFileSync(__dirname + "/mobile-step-editor.tsx", "utf8");
    expect(source).toContain('disabled={!canEditSlug}');
    expect(source).toContain('readOnly={!canEditSlug}');
    expect(source).toContain("Paket Free menggunakan slug workspace. Upgrade untuk memakai slug kustom.");
    expect(source).toContain("Free uses your workspace slug. Upgrade to use a custom slug.");
    expect(source).toContain('href="/app/billing"');
    expect(source).toContain('>Upgrade</Link>');
  });
});

describe("mobile canvas-first surface", () => {
  it("keeps the canvas visible as the primary surface with no drawer open by default", () => {
    render(<Harness />);

    expect(canvas()).toBeTruthy();
    expect(canvas().textContent).toContain(DEFAULT_PERSONAL_SITE.title);
    expect(toolbar()).toBeTruthy();
    // Canvas-first: the old wizard's step chrome is gone, and no management
    // drawer is mounted until the user asks for one.
    expect(screen.queryByText(/Langkah|Step \d/)).toBeNull();
    expect(screen.queryByTestId("mobile-drawer-elements")).toBeNull();
    expect(screen.queryByTestId("mobile-drawer-structure")).toBeNull();
  });

  it("opens the Elements drawer with page management and the section templates", async () => {
    const user = userEvent.setup();
    const onUpdateSite = vi.fn();
    render(<Harness onUpdateSite={onUpdateSite} />);

    await user.click(screen.getByRole("button", { name: "Elements" }));

    const drawer = screen.getByTestId("mobile-drawer-elements");
    expect(drawer.textContent).toContain("Pages");
    expect(drawer.textContent).toContain("Add Page");
    expect(drawer.textContent).toContain("Three Service Cards");

    // Adding from a template still mutates the site (capability kept, not dropped).
    await user.click(within(drawer).getByText("Three Service Cards"));
    expect(onUpdateSite).toHaveBeenCalled();
    const patch = onUpdateSite.mock.calls.at(-1)![0] as Partial<PersonalSiteInput>;
    expect((patch.sections ?? []).length).toBe(DEFAULT_PERSONAL_SITE.sections.length + 1);
  });

  it("opens the Structure drawer listing sections with reorder, duplicate, delete", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Structure" }));

    const drawer = screen.getByTestId("mobile-drawer-structure");
    expect(drawer.textContent).toContain("Sections");
    expect(document.getElementById("section-row-default-services")).toBeTruthy();
    // One action group per row, so each label appears once per section.
    for (const name of ["Move section up", "Move section down", "Duplicate section", "Delete section"]) {
      expect(within(drawer).getAllByRole("button", { name })).toHaveLength(DEFAULT_PERSONAL_SITE.sections.length);
    }
  });

  it("selects a section from Structure and opens the Properties drawer over the canvas", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Structure" }));
    await user.click(document.getElementById("section-row-default-services")!);

    // The canvas section is highlighted, canvas is still mounted underneath.
    const wrappers = Array.from(container.querySelectorAll('[data-section-id="default-services"]'));
    expect(wrappers.some((el) => el.className.includes("outline-primary"))).toBe(true);
    expect(canvas()).toBeTruthy();

    // Properties drawer shows the selected section's content.
    const properties = screen.getByTestId("mobile-drawer-properties");
    expect(properties.textContent).toContain("services");
    expect(within(properties).getByDisplayValue(DEFAULT_PERSONAL_SITE.sections[0].heading)).toBeTruthy();
  });

  it("opens the Theme and Publish drawers with their wizard controls intact", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Theme" }));
    expect(screen.getByTestId("mobile-drawer-theme").textContent).toContain("Primary Color");

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Publish" }));
    const publish = screen.getByTestId("mobile-drawer-publish");
    expect(publish.textContent).toContain("URL Slug");
    expect(publish.textContent).toContain("SEO");
  });

  it("returns focus to the toolbar trigger when a drawer closes", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Structure" });
    await user.click(trigger);
    expect(screen.getByTestId("mobile-drawer-structure")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("mobile-drawer-structure")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("mobile 390px containment", () => {
  it("scrolls the toolbar horizontally instead of overflowing, with no fixed pixel width", () => {
    const { container } = render(<Harness />);

    // The containment-producing contract: a horizontal scroller whose children
    // may not shrink (so they scroll, never squeeze) — jsdom cannot measure this.
    expect(toolbar().className).toContain("overflow-x-auto");
    for (const trigger of toolbar().querySelectorAll("button")) {
      expect(trigger.className).toContain("shrink-0");
    }

    // No element in the surface pins a pixel width; anything wider than the
    // 390px viewport would overflow. The only fixed-width class allowed is the
    // canvas frame itself, capped at exactly 390px.
    const offenders: string[] = [];
    for (const el of container.querySelectorAll<HTMLElement>("[class]")) {
      for (const token of (el.getAttribute("class") ?? "").split(/\s+/)) {
        const m = /^w-\[(\d+)px\]$/.exec(token);
        if (m && Number(m[1]) > 390) offenders.push(`${el.tagName}.${token}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(canvas().className).toContain("overflow-x-hidden");
    expect(container.querySelector('[data-preview-device="mobile"]')!.className).toContain("max-w-[390px]");
  });

  it("keeps the inline toolbar inside the viewport by wrapping and capping its width", async () => {
    const { container } = render(<Harness />);

    const editable = typographyEditable(container);
    // Focus, don't click: clicking section text also selects the section (opens
    // the Properties drawer), which is not what this containment test is about.
    act(() => editable.focus());

    const floating = Array.from(container.querySelectorAll<HTMLElement>("div")).find((el) =>
      el.classList.contains("max-w-[calc(100vw-1.5rem)]"),
    );
    expect(floating).toBeTruthy();
    expect(floating!.className).toContain("flex-wrap");
  });

  it("preserves focus while the inline toolbar is used, and the toolbar still applies formatting", async () => {
    const { container } = render(<Harness />);

    const editable = typographyEditable(container);
    act(() => editable.focus());
    expect(document.activeElement).toBe(editable);

    const bold = screen.getByTitle("Bold");
    const italic = screen.getByTitle("Italic");

    // Focus preservation contract: the floating toolbar cancels mousedown so the
    // edited text never blurs. jsdom (and userEvent) move focus to a clicked
    // button regardless, so the real guarantee — a default-prevented mousedown —
    // is asserted directly: fireEvent.mouseDown returns false when cancelled.
    expect(fireEvent.mouseDown(bold)).toBe(false);
    expect(document.activeElement).toBe(editable);

    // ...and the interaction is not a dead end: the edit still lands (the
    // Services heading becomes italic through the shared typography state).
    fireEvent.click(italic);
    expect(editable.className).toContain("italic");
  });
});
