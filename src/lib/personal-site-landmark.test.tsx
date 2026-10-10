/**
 * The Landing canvas must not add a `main` landmark: `/app/personal-site` is
 * already wrapped in `<main id="main-content">` by AppShell, and the scrolling
 * canvas lives inside it. Rendered assertions, not source-string matching, so a
 * legitimate layout refactor cannot break this test.
 */
/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { CanvasEditor } from "@/components/site/canvas/canvas-editor";

function renderInsideAppShell() {
  return render(
    <main id="main-content">
      <CanvasEditor
        initialSite={DEFAULT_PERSONAL_SITE}
        previewUrl="https://example.test/site/my-studio"
        publicSiteBaseUrl="https://example.test"
        onSave={vi.fn(async () => {})}
        canEditSlug
      />
    </main>,
  );
}

describe("personal site landmarks", () => {
  it("does not nest a second main landmark inside the app shell", () => {
    const { container } = renderInsideAppShell();

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector("main")!.querySelector("main")).toBeNull();
    expect(screen.getByRole("main").getAttribute("id")).toBe("main-content");
  });

  it("keeps the scrolling canvas viewport inside that single main landmark", () => {
    const { container } = renderInsideAppShell();

    const viewport = screen.getByTestId("builder-canvas-viewport");
    expect(viewport.className).toContain("overflow-y-auto");
    expect(container.querySelector("main")!.contains(viewport)).toBe(true);
  });
});
