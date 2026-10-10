/**
 * Landing desktop canvas must render on the shared builder shell primitives:
 * one workflow header (BUILD / SETTINGS / PUBLISH), a left tools rail, a center
 * canvas scroller, and a right properties rail — with preview mode hiding the
 * mutation affordances while keeping the canvas scroller alive.
 */
/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_PERSONAL_SITE } from "@/lib/personal-site/model";

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

function renderEditor() {
  return render(
    <CanvasEditor
      initialSite={DEFAULT_PERSONAL_SITE}
      previewUrl="https://example.test/site/my-studio"
      publicSiteBaseUrl="https://example.test"
      onSave={vi.fn(async () => {})}
      canEditSlug
    />,
  );
}

const shell = () => screen.getByTestId("builder-shell");
const leftRail = () => screen.queryByRole("complementary", { name: /left builder tools/i });

describe("landing desktop shell", () => {
  it("puts the workflow tabs, tools rail, canvas scroller, and properties rail on the shell", async () => {
    const { container } = renderEditor();

    const banner = screen.getByRole("banner");
    for (const tab of ["BUILD", "SETTINGS", "PUBLISH"]) {
      expect(banner.textContent).toContain(tab);
    }

    expect(leftRail()).not.toBeNull();

    const main = screen.getByRole("main");
    expect(main.className).toContain("overflow-y-auto");

    // The properties rail is the existing panel; it only mounts once a section is selected.
    // Select through the Structure tab (a real user path) because canvas selection needs pointer events.
    expect(screen.queryByText("Section Properties")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /structure/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /drag to reorder/i })[0].parentElement!);
    const rails = screen.getAllByRole("complementary");
    expect(rails.some((el) => el.textContent?.includes("Section Properties"))).toBe(true);

    // Rails and canvas scroll independently: main is the scroller, not the shell.
    expect(shell().className).not.toContain("overflow-y-auto");
    expect(leftRail()!.className).toContain("overflow-y-auto");
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });

  it("hides mutation affordances in preview mode but keeps the canvas scroller", () => {
    renderEditor();

    expect(shell().getAttribute("data-preview-mode")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    expect(shell().getAttribute("data-preview-mode")).toBe("true");
    expect(leftRail()).toBeNull();
    expect(screen.queryByText("Section Properties")).toBeNull();
    expect(screen.getByRole("main").className).toContain("overflow-y-auto");
  });

  it("keeps the workflow header on every tab while the build rails stay build-only", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "SETTINGS" }));

    const banner = screen.getByRole("banner");
    expect(banner.textContent).toContain("BUILD");
    expect(banner.textContent).toContain("PUBLISH");
    expect(leftRail()).toBeNull();
    expect(screen.getByRole("main")).not.toBeNull();
  });
});
