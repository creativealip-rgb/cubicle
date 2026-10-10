/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuilderCanvasViewport, BuilderMobileDrawer, BuilderRail, BuilderShell, BuilderWorkflowHeader } from "./builder-shell";

describe("builder shell", () => {
  it("renders accessible workflow header and three builder regions", () => {
    render(
      <BuilderShell
        header={<BuilderWorkflowHeader>Header slot</BuilderWorkflowHeader>}
        leftRail={<BuilderRail side="left">Left slot</BuilderRail>}
        canvas={<BuilderCanvasViewport>Canvas slot</BuilderCanvasViewport>}
        rightRail={<BuilderRail side="right">Properties slot</BuilderRail>}
      />,
    );
    expect(screen.getByRole("banner").textContent).toContain("Header slot");
    expect(screen.getByRole("complementary", { name: /left/i }).textContent).toContain("Left slot");
    expect(screen.getByRole("main").textContent).toContain("Canvas slot");
    expect(screen.getByRole("complementary", { name: /properties/i }).textContent).toContain("Properties slot");
  });

  it("supports preview mode and mobile drawer slots", () => {
    render(<BuilderShell previewMode mobileDrawer={<BuilderMobileDrawer>Mobile tools</BuilderMobileDrawer>} canvas={<BuilderCanvasViewport>Canvas</BuilderCanvasViewport>} />);
    expect(screen.getByTestId("builder-shell").getAttribute("data-preview-mode")).toBe("true");
    expect(screen.getByRole("dialog", { name: /mobile builder/i }).textContent).toContain("Mobile tools");
  });

  it("puts the border on the inner edge of each rail", () => {
    render(
      <>
        <BuilderRail side="left">Left</BuilderRail>
        <BuilderRail side="right" widthClass="w-80">Right</BuilderRail>
      </>,
    );
    expect(screen.getByRole("complementary", { name: /left/i }).className).toContain("border-r");
    const right = screen.getByRole("complementary", { name: /properties/i });
    expect(right.className).toContain("border-l");
    expect(right.className).toContain("w-80");
  });
});

it("keeps canvas viewport independently scrollable", () => {
  render(<BuilderCanvasViewport>Canvas</BuilderCanvasViewport>);
  expect(screen.getByRole("main").className).toContain("overflow-y-auto");
});
