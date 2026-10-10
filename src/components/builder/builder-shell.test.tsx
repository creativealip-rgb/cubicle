/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuilderCanvasViewport, BuilderMobileDrawer, BuilderRail, BuilderShell, BuilderWorkflowHeader } from "./builder-shell";

const viewport = () => screen.getByTestId("builder-canvas-viewport");

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
    expect(viewport().textContent).toContain("Canvas slot");
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

  it("keeps canvas viewport independently scrollable", () => {
    render(<BuilderCanvasViewport>Canvas</BuilderCanvasViewport>);
    expect(viewport().className).toContain("overflow-y-auto");
  });

  it("merges caller className instead of dropping it", () => {
    render(
      <BuilderShell
        className="bg-muted/30"
        header={<BuilderWorkflowHeader className="z-30">H</BuilderWorkflowHeader>}
        canvas={<BuilderCanvasViewport className="flex justify-center p-6">C</BuilderCanvasViewport>}
        mobileDrawer={<BuilderMobileDrawer className="fixed inset-x-0 bottom-0">M</BuilderMobileDrawer>}
      />,
    );
    expect(screen.getByTestId("builder-shell").className).toContain("flex");
    expect(screen.getByTestId("builder-shell").className).toContain("bg-muted/30");
    expect(screen.getByRole("banner").className).toContain("z-30");
    expect(viewport().className).toContain("overflow-y-auto");
    expect(viewport().className).toContain("justify-center");
    const drawer = screen.getByRole("dialog", { name: /mobile builder/i });
    expect(drawer.className).toContain("md:hidden");
    expect(drawer.className).toContain("fixed");
  });

  it("renders with only a canvas and no optional slots", () => {
    render(<BuilderShell canvas={<BuilderCanvasViewport>Canvas</BuilderCanvasViewport>} />);
    expect(viewport().textContent).toContain("Canvas");
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never adds a nested main landmark when mounted inside the app shell", () => {
    const { container } = render(
      <main id="main-content">
        <BuilderShell
          header={<BuilderWorkflowHeader>H</BuilderWorkflowHeader>}
          canvas={<BuilderCanvasViewport>Canvas</BuilderCanvasViewport>}
        />
      </main>,
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector("main")!.querySelector("main")).toBeNull();
  });
});
