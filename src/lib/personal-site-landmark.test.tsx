/**
 * The Landing canvas must expose exactly one `main` landmark and keep the
 * scrolling canvas on it. Rendered assertions, not source-string matching, so a
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

describe("personal site landmarks", () => {
  it("renders exactly one main landmark and never nests one", () => {
    const { container } = renderEditor();

    const mains = screen.getAllByRole("main");
    expect(mains).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(mains[0].querySelector("main")).toBeNull();
  });

  it("keeps the scrolling canvas on that single main landmark", () => {
    renderEditor();

    expect(screen.getByRole("main").className).toContain("overflow-y-auto");
  });
});
