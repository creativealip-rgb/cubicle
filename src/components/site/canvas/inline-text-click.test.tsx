// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InlineText, type TextTypography } from "./inline-text";

afterEach(cleanup);

function Harness() {
  const [typography, setTypography] = useState<TextTypography>({});
  return <InlineText value="Text" onChange={() => {}} typography={typography} onTypographyChange={(patch) => setTypography((current) => ({ ...current, ...patch }))} />;
}

describe("InlineText toolbar", () => {
  it("applies formatting from a real toolbar click", () => {
    const { container } = render(<Harness />);
    fireEvent.focus(container.querySelector("[contenteditable=true]")!);
    const bold = screen.getByRole("button", { name: "Bold" });
    fireEvent.mouseDown(bold);
    fireEvent.click(bold);
    expect(bold.getAttribute("aria-pressed")).toBe("true");
  });

  it("links only selected text", () => {
    const { container } = render(<Harness />);
    const editor = container.querySelector("[contenteditable=true]")!;
    fireEvent.focus(editor);
    const range = document.createRange();
    range.setStart(editor.firstChild!, 0);
    range.setEnd(editor.firstChild!, 4);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.click(screen.getByTitle("Insert Link"));
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "https://example.com" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Save" }));
    expect(container.querySelector('a[href="https://example.com"]')?.textContent).toBe("Text");
  });

  it("renders each saved line as one native list item", () => {
    render(<InlineText value={'One\nTwo'} onChange={() => {}} typography={{ listType: "bullet" }} onTypographyChange={() => {}} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("links only selected text inside a list item", () => {
    function ListHarness() {
      const [typography, setTypography] = useState<TextTypography>({ listType: "bullet" });
      return <InlineText value={'Alpha selected Omega\nSecond item'} onChange={() => {}} typography={typography} onTypographyChange={(patch) => setTypography((current) => ({ ...current, ...patch }))} />;
    }
    const { container } = render(<ListHarness />);
    const firstItem = container.querySelector("li")!;
    fireEvent.focus(container.querySelector("[contenteditable=true]")!);
    const range = document.createRange();
    range.setStart(firstItem.firstChild!, 6);
    range.setEnd(firstItem.firstChild!, 14);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.click(screen.getByTitle("Insert Link"));
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "https://example.com/list" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Save" }));
    const links = container.querySelectorAll("li a");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe("selected");
    expect(firstItem.textContent).toBe("Alpha selected Omega");
  });
});
