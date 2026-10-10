/**
 * Keyboard shortcuts shared by the builders.
 *
 * Kept as pure functions so the rules can be tested without a DOM and reused by
 * other builders — the Forms builder still carries its own unguarded copy.
 */

export type BuilderShortcutAction = "undo" | "redo" | "duplicate" | "delete" | "save" | "deselect";

/** The subset of KeyboardEvent the resolver reads, so tests can pass a literal. */
export type ShortcutKeyEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

/**
 * True when the keystroke belongs to a text field rather than the document.
 *
 * `contenteditable` is checked through `closest()` as well as the target's own
 * flag: a keystroke inside the inline text editor lands on a child element of
 * the editable host, and platform support for the inherited `isContentEditable`
 * flag varies.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const element = target as {
    tagName?: unknown;
    isContentEditable?: boolean;
    closest?: (selector: string) => unknown;
  };

  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    return true;
  }
  if (element.isContentEditable === true) return true;
  if (typeof element.closest === "function" && element.closest('[contenteditable="true"]')) {
    return true;
  }
  return false;
}

function hasModifier(event: ShortcutKeyEvent): boolean {
  return Boolean(event.ctrlKey || event.metaKey);
}

function keyOf(event: ShortcutKeyEvent): string {
  return typeof event.key === "string" ? event.key.toLowerCase() : "";
}

/**
 * Decide what a keystroke means for the builder document, or null when the
 * platform should keep it — notably native text undo/redo while editing.
 *
 * Ctrl/Cmd+S still saves from inside a field, because saving is a document-level
 * intent that has no native meaning in a text input.
 */
export function resolveBuilderShortcut(
  event: ShortcutKeyEvent,
  options: { target: EventTarget | null; hasSelection?: boolean },
): BuilderShortcutAction | null {
  const key = keyOf(event);

  if (hasModifier(event) && key === "s") return "save";

  // Everything below is a document edit. While a field has focus these keys
  // belong to the field, so never intercept them.
  if (isEditableTarget(options.target)) return null;

  if (event.key === "Escape") return "deselect";

  if (event.key === "Delete" || event.key === "Backspace") {
    return options.hasSelection ? "delete" : null;
  }
  if (hasModifier(event) && key === "d") {
    return options.hasSelection ? "duplicate" : null;
  }
  if (hasModifier(event) && key === "z" && !event.shiftKey) return "undo";
  if (hasModifier(event) && (key === "y" || (event.shiftKey && key === "z"))) return "redo";

  return null;
}
