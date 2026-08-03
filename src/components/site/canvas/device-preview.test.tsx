/**
 * Focused tests for the device-preview width mapping helper (Phase 5).
 * Pure function — no React rendering required.
 */
import { describe, it, expect } from "vitest";
import { getCanvasMaxWidthClass, CANVAS_DEVICES, type CanvasDevice } from "./canvas-renderer";

describe("getCanvasMaxWidthClass", () => {
  it("returns max-w-5xl for desktop", () => {
    expect(getCanvasMaxWidthClass("desktop")).toBe("max-w-5xl");
  });

  it("returns max-w-3xl for tablet", () => {
    expect(getCanvasMaxWidthClass("tablet")).toBe("max-w-3xl");
  });

  it("returns the exact mobile frame width (390px)", () => {
    expect(getCanvasMaxWidthClass("mobile")).toBe("max-w-[390px]");
  });

  it("covers every device in CANVAS_DEVICES with a non-empty class", () => {
    for (const device of CANVAS_DEVICES) {
      const cls = getCanvasMaxWidthClass(device);
      expect(cls).toMatch(/^max-w-/);
      expect(cls.length).toBeGreaterThan("max-w-".length);
    }
  });

  it("produces distinct width classes per device", () => {
    const widths = CANVAS_DEVICES.map((d) => getCanvasMaxWidthClass(d));
    expect(new Set(widths).size).toBe(widths.length);
  });

  it("falls back to desktop width for an unexpected device value", () => {
    expect(getCanvasMaxWidthClass("ultrawide" as unknown as CanvasDevice)).toBe("max-w-5xl");
  });

  it("mobile width is strictly narrower than tablet, tablet narrower than desktop", () => {
    // Tailwind scale: 390px < 48rem (768px) < 64rem (1024px).
    const mobile = getCanvasMaxWidthClass("mobile");
    const tablet = getCanvasMaxWidthClass("tablet");
    const desktop = getCanvasMaxWidthClass("desktop");
    expect(mobile).toBe("max-w-[390px]");
    expect(tablet).toBe("max-w-3xl");
    expect(desktop).toBe("max-w-5xl");
  });
});

describe("CANVAS_DEVICES", () => {
  it("exposes exactly desktop, tablet, and mobile in stable order", () => {
    expect(CANVAS_DEVICES).toEqual(["desktop", "tablet", "mobile"]);
  });
});
