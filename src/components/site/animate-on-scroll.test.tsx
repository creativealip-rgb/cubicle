/** @vitest-environment jsdom */
/**
 * Reduced-motion contract for the JS-driven section animation preview.
 * The globals.css media query only shortens CSS transitions; the reveal is
 * deferred by an IntersectionObserver, so the component must short-circuit it.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AnimateOnScroll } from "./animate-on-scroll";

function stubMatchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe("AnimateOnScroll reduced motion", () => {
  it("reveals the section immediately instead of waiting for the scroll observer", () => {
    stubMatchMedia(true);
    const { container } = render(
      <AnimateOnScroll animation="fade-up">
        <span>content</span>
      </AnimateOnScroll>,
    );

    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("site-animate");
    expect(el.classList.contains("site-visible")).toBe(true);
  });
});
