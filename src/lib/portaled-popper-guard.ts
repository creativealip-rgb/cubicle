/**
 * Portaled overlays (Select / Popover / Dropdown / Combobox) sit outside
 * Dialog/Sheet DOM. Clicking them is "outside" for Radix DismissableLayer.
 * Same-value Select reselect unmounts the item before deferred outside
 * handlers run, so event.composedPath() is often empty by then — track the
 * interaction at capture time while the node still exists.
 */
export const PORTALED_POPPER_SELECTOR = [
  "[data-cubiqlo-select-content]",
  "[data-radix-popper-content-wrapper]",
  "[data-radix-select-viewport]",
  "[data-radix-select-content]",
  "[data-radix-dropdown-menu-content]",
  "[data-radix-popover-content]",
  "[data-radix-combobox-content]",
  "[role='listbox']",
  "[role='option']",
  "[role='menu']",
  "[role='menuitem']",
].join(", ");

export function isPortaledPopperNode(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false;
  if (typeof node.closest !== "function") return false;
  return !!node.closest(PORTALED_POPPER_SELECTOR);
}

export function isOpenPortaledLayer(): boolean {
  return !!document.querySelector(PORTALED_POPPER_SELECTOR);
}

export function isSelectTriggerNode(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false;
  // Radix SelectTrigger is role=combobox; also catch any aria-expanded control
  // that owns an open listbox (safe for nested Select in dialogs/sheets).
  if (node.closest?.("[role='combobox']")) return true;
  if (node.getAttribute?.("aria-haspopup") === "listbox") return true;
  return false;
}

export function isFromPortaledPopper(event: {
  detail?: { originalEvent?: Event };
  target?: EventTarget | null;
}): boolean {
  const original = event.detail?.originalEvent;

  // Prefer path captured during the original pointer event. After the event
  // finishes (deferred pointer-outside → click), composedPath() is often [].
  if (original && typeof original.composedPath === "function") {
    try {
      for (const node of original.composedPath()) {
        if (isPortaledPopperNode(node) || isSelectTriggerNode(node)) return true;
      }
    } catch {
      // ignore
    }
  }

  const target = (original?.target ?? event.target) as Node | null;
  if (isPortaledPopperNode(target) || isSelectTriggerNode(target)) return true;

  // Same-value Select reselect: option unmounts before guard runs.
  if (target && target instanceof Node && !document.contains(target)) return true;

  // Nested Select open: body/overlay can receive the click because modal Select
  // sets pointer-events:none on the document (trigger looks clickable but the
  // hit-test lands on Dialog/Sheet overlay). Keep surface open while any
  // portaled layer is mounted — true outside click still closes Select first,
  // then the surface on the next interaction.
  if (isOpenPortaledLayer()) return true;

  return false;
}

/** Attach capture-phase listeners; returns { shouldKeepOpen, cleanup }. */
export function createPortaledPopperOutsideGuard() {
  let popperPointer = false;
  let popperPointerTimer: ReturnType<typeof setTimeout> | null = null;

  const markIfPopper = (event: Event) => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const hit =
      isOpenPortaledLayer() ||
      path.some((n) => isPortaledPopperNode(n) || isSelectTriggerNode(n)) ||
      isPortaledPopperNode(event.target) ||
      isSelectTriggerNode(event.target);

    if (!hit) return;

    popperPointer = true;
    if (popperPointerTimer) clearTimeout(popperPointerTimer);
    // Keep flag long enough for deferred pointer-outside + interact-outside
    // (Radix defers to click with setTimeout 0) even after Select unmounts.
    popperPointerTimer = setTimeout(() => {
      popperPointer = false;
      popperPointerTimer = null;
    }, 200);
  };

  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", markIfPopper, true);
    document.addEventListener("mousedown", markIfPopper, true);
    document.addEventListener("touchstart", markIfPopper, true);
    document.addEventListener("click", markIfPopper, true);
  }

  return {
    shouldKeepOpen(event: {
      detail?: { originalEvent?: Event };
      target?: EventTarget | null;
    }) {
      return popperPointer || isFromPortaledPopper(event);
    },
    cleanup() {
      if (typeof document === "undefined") return;
      document.removeEventListener("pointerdown", markIfPopper, true);
      document.removeEventListener("mousedown", markIfPopper, true);
      document.removeEventListener("touchstart", markIfPopper, true);
      document.removeEventListener("click", markIfPopper, true);
      if (popperPointerTimer) clearTimeout(popperPointerTimer);
    },
  };
}
