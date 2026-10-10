/** @vitest-environment jsdom */
import { useEffect, useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptySection, PERSONAL_SITE_SECTION_TYPES, type PersonalSiteSection } from "@/lib/personal-site/model";
import { MobilePropertiesDrawer } from "./mobile-properties-drawer";

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
// The drawer opens only on mobile viewports (matches the `md:hidden` editor wrapper).
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

/**
 * Per-type parity table. Keys come from the `PersonalSiteSection` union, so
 * dropping/adding a section type without covering it here fails `tsc` (TS2741)
 * — a 21st type cannot silently escape the mobile drawer.
 * The value is a marker only the mobile drawer's editor renders for that type
 * (null = shared heading/animation fields are that type's whole property set).
 */
const MOBILE_PARITY: Record<PersonalSiteSection["type"], string | null> = {
  services: "Add service",
  process: "Add step",
  pricing: "Add offer",
  portfolio: "Add project",
  testimonials: "Add testimonial",
  faq: "Add question",
  contact: "Add contact",
  custom: "Custom Content",
  cta: "Call to action",
  gallery: "Add image",
  image: "Image Size",
  mediaText: "Media Position",
  booking: "Calendar Integration",
  embed: "Embed URL",
  social: "Add social link",
  // divider and tableOfContents carry no content fields — heading/animation is
  // their whole property set. This is intentional, not a missing editor.
  divider: null,
  collapsible: "Add collapsible item",
  spacer: "Spacer height (px)",
  tableOfContents: null,
  contentBlock: "Add column",
};

const ALL_TYPES = Object.keys(MOBILE_PARITY) as PersonalSiteSection["type"][];

function Harness({ initial }: { initial: PersonalSiteSection }) {
  const [section, setSection] = useState<PersonalSiteSection | null>(initial);
  const [lastId, setLastId] = useState(initial.id);

  useEffect(() => { setSection(initial); setLastId(initial.id); }, [initial]);

  return (
    <main id="main-content">
      <button type="button" id={`section-row-${lastId}`}>row {lastId}</button>
      <MobilePropertiesDrawer
        section={section}
        onUpdate={() => {}}
        onClose={() => setSection(null)}
      />
    </main>
  );
}

describe("mobile properties drawer parity", () => {
  it("table covers every section type in the schema", () => {
    expect(new Set(ALL_TYPES)).toEqual(new Set(PERSONAL_SITE_SECTION_TYPES));
    expect(ALL_TYPES).toHaveLength(20);
  });

  it.each(ALL_TYPES)("%s: mobile drawer exposes its properties", (type) => {
    const section = emptySection(type);
    render(<Harness initial={section} />);

    // Type badge + shared heading field: the drawer renders this type's content,
    // not the desktop-only rail.
    expect(screen.getByText(type)).toBeTruthy();
    expect(screen.getByDisplayValue(section.heading)).toBeTruthy();

    const marker = MOBILE_PARITY[type];
    if (marker) expect(screen.getByText(marker)).toBeTruthy();
  });


  it("does not gate drawer content behind the desktop-only rail classes", () => {
    const section = emptySection("services");
    render(<Harness initial={section} />);

    // Regression guard: the mobile content must never be wrapped in the desktop
    // rail's `hidden md:flex` chrome, which would make it unreachable on mobile.
    const offenders: string[] = [];
    for (let el: HTMLElement | null = screen.getByText("services").parentElement; el; el = el.parentElement) {
      const className = el.getAttribute("class") ?? "";
      if (className.split(/\s+/).includes("hidden") && className.includes("md:flex")) {
        offenders.push(`${el.tagName}.${className}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("returns focus to the selected section row after close", async () => {
    const user = userEvent.setup();
    const section = emptySection("services");
    render(<Harness initial={section} />);

    const row = document.getElementById(`section-row-${section.id}`)!;
    await user.click(screen.getByRole("button", { name: "Close properties panel" }));

    expect(document.activeElement).toBe(row);
  });

  it("closes on Escape and returns focus to the section row", async () => {
    const user = userEvent.setup();
    const section = emptySection("faq");
    render(<Harness initial={section} />);

    await user.keyboard("{Escape}");

    expect(screen.queryByDisplayValue(section.heading)).toBeNull();
    expect(document.activeElement).toBe(document.getElementById(`section-row-${section.id}`));
  });

  it("reflects edits through the shared content component", async () => {
    const user = userEvent.setup();
    const section = emptySection("custom");
    const onUpdate = vi.fn();
    render(
      <MobilePropertiesDrawer section={section} onUpdate={onUpdate} onClose={() => {}} />
    );

    await user.type(screen.getByDisplayValue(section.heading), "!");

    expect(onUpdate).toHaveBeenCalledWith({ heading: `${section.heading}!` });
  });
});
