/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import { isEditableTarget, resolveBuilderShortcut } from "./builder-shortcuts";

function press(key: string, modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}) {
  return { key, ctrlKey: modifiers.ctrl, metaKey: modifiers.meta, shiftKey: modifiers.shift };
}

/** Every target that owns its own text editing and therefore owns undo/redo. */
const EDITABLE_TARGETS: Array<[string, HTMLElement]> = [
  ["input", document.createElement("input")],
  ["textarea", document.createElement("textarea")],
  ["select", document.createElement("select")],
];

function contentEditableTarget() {
  const host = document.createElement("div");
  host.setAttribute("contenteditable", "true");
  return host;
}

describe("isEditableTarget", () => {
  it.each(EDITABLE_TARGETS)("treats a focused %s as editable", (_name, element) => {
    expect(isEditableTarget(element)).toBe(true);
  });

  it("treats a contenteditable host as editable", () => {
    expect(isEditableTarget(contentEditableTarget())).toBe(true);
  });

  it("walks up from a child of a contenteditable host", () => {
    // Keystrokes inside the inline text editor land on an inner span, not the
    // editable host itself.
    const host = contentEditableTarget();
    const child = document.createElement("span");
    host.appendChild(child);
    expect(isEditableTarget(child)).toBe(true);
  });

  it("treats chrome elements and a missing target as not editable", () => {
    expect(isEditableTarget(document.createElement("div"))).toBe(false);
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("resolveBuilderShortcut — text editing keeps its own undo", () => {
  const editable = () => document.createElement("input");

  it("does not intercept undo, redo, delete or duplicate while editing", () => {
    const target = editable();
    const pressed = [
      press("z", { ctrl: true }),
      press("z", { meta: true }),
      press("y", { ctrl: true }),
      press("z", { ctrl: true, shift: true }),
      press("Delete", {}),
      press("Backspace", {}),
      press("d", { ctrl: true }),
    ];
    for (const event of pressed) {
      expect(resolveBuilderShortcut(event, { target, hasSelection: true })).toBeNull();
    }
  });

  it("still saves from inside a field", () => {
    // Saving has no native meaning in a text field, so it stays a document
    // shortcut even while typing.
    expect(resolveBuilderShortcut(press("s", { ctrl: true }), { target: editable() })).toBe("save");
    expect(resolveBuilderShortcut(press("s", { meta: true }), { target: editable() })).toBe("save");
  });

  it("leaves Escape and Shift+Ctrl+Z alone while editing", () => {
    expect(resolveBuilderShortcut(press("Escape"), { target: editable() })).toBeNull();
  });

  it("does not intercept keys inside the inline contenteditable editor", () => {
    const host = contentEditableTarget();
    const child = document.createElement("span");
    host.appendChild(child);
    expect(resolveBuilderShortcut(press("z", { ctrl: true }), { target: child })).toBeNull();
    expect(resolveBuilderShortcut(press("Backspace"), { target: child, hasSelection: true })).toBeNull();
  });
});

describe("resolveBuilderShortcut — document editing", () => {
  const chrome = () => document.createElement("div");

  it("maps undo and redo for both modifier keys", () => {
    expect(resolveBuilderShortcut(press("z", { ctrl: true }), { target: chrome() })).toBe("undo");
    expect(resolveBuilderShortcut(press("z", { meta: true }), { target: chrome() })).toBe("undo");
    expect(resolveBuilderShortcut(press("y", { ctrl: true }), { target: chrome() })).toBe("redo");
    expect(resolveBuilderShortcut(press("Z", { ctrl: true, shift: true }), { target: chrome() })).toBe("redo");
  });

  it("only deletes or duplicates while a section is selected", () => {
    expect(resolveBuilderShortcut(press("Delete"), { target: chrome(), hasSelection: true })).toBe("delete");
    expect(resolveBuilderShortcut(press("d", { ctrl: true }), { target: chrome(), hasSelection: true })).toBe("duplicate");
    // Without a selection these keys must fall through to the browser.
    expect(resolveBuilderShortcut(press("Delete"), { target: chrome(), hasSelection: false })).toBeNull();
    expect(resolveBuilderShortcut(press("d", { ctrl: true }), { target: chrome(), hasSelection: false })).toBeNull();
  });

  it("deselects on Escape and ignores unbound keys", () => {
    expect(resolveBuilderShortcut(press("Escape"), { target: chrome() })).toBe("deselect");
    expect(resolveBuilderShortcut(press("a"), { target: chrome() })).toBeNull();
    expect(resolveBuilderShortcut(press("z"), { target: chrome() })).toBeNull();
  });
});
