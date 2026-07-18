"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Portaled overlays (Select / Popover / Dropdown / Combobox) sit outside Dialog
// DOM. Clicking them is "outside" for DismissableLayer. Same-value Select
// reselect unmounts the item before deferred outside handlers run, so
// event.composedPath() is often empty by then — track the interaction at
// capture time while the node still exists.
const PORTALED_POPPER_SELECTOR = [
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
].join(", ")

function isPortaledPopperNode(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false
  if (typeof node.closest !== "function") return false
  return !!node.closest(PORTALED_POPPER_SELECTOR)
}

function isOpenPortaledLayer(): boolean {
  return !!document.querySelector(PORTALED_POPPER_SELECTOR)
}

function isSelectTriggerNode(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false
  // Radix SelectTrigger is role=combobox; also catch any aria-expanded control
  // that owns an open listbox (safe for nested Select in dialogs).
  if (node.closest?.("[role='combobox']")) return true
  if (node.getAttribute?.("aria-haspopup") === "listbox") return true
  return false
}

function isFromPortaledPopper(event: {
  detail?: { originalEvent?: Event }
  target?: EventTarget | null
}): boolean {
  const original = event.detail?.originalEvent

  // Prefer path captured during the original pointer event. After the event
  // finishes (deferred pointer-outside → click), composedPath() is often [].
  if (original && typeof original.composedPath === "function") {
    try {
      for (const node of original.composedPath()) {
        if (isPortaledPopperNode(node) || isSelectTriggerNode(node)) return true
      }
    } catch {
      // ignore
    }
  }

  const target = (original?.target ?? event.target) as Node | null
  if (isPortaledPopperNode(target) || isSelectTriggerNode(target)) return true

  // Same-value Select reselect: option unmounts before guard runs.
  if (target && target instanceof Node && !document.contains(target)) return true

  // Nested Select open: body/overlay can receive the click because modal Select
  // sets pointer-events:none on the document (trigger looks clickable but the
  // hit-test lands on Dialog overlay). Keep dialog open while any portaled
  // layer is mounted — true outside click still closes Select first, then
  // dialog on the next interaction.
  if (isOpenPortaledLayer()) return true

  return false
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onInteractOutside, onPointerDownOutside, onFocusOutside, ...props }, ref) => {
  // Capture-phase flag: still true after Select unmounts for the deferred
  // outside handlers that fire on the subsequent click tick.
  const popperPointerRef = React.useRef(false)
  const popperPointerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const markIfPopper = (event: Event) => {
      const path =
        typeof event.composedPath === "function" ? event.composedPath() : []
      // While a nested Select/Popover layer is open, ANY pointer event can
      // land on the Dialog overlay (Select Content sets
      // disableOutsidePointerEvents → body pointer-events:none; the
      // still-visible SelectTrigger is not hit-testable). Capture that here
      // before Select unmounts the layer on the same click tick.
      const hit =
        isOpenPortaledLayer() ||
        path.some(
          (n) => isPortaledPopperNode(n) || isSelectTriggerNode(n),
        ) ||
        isPortaledPopperNode(event.target) ||
        isSelectTriggerNode(event.target)

      if (!hit) return

      popperPointerRef.current = true
      if (popperPointerTimerRef.current) {
        clearTimeout(popperPointerTimerRef.current)
      }
      // Keep flag long enough for deferred pointer-outside + interact-outside
      // (Radix defers to click with setTimeout 0) even after Select unmounts.
      popperPointerTimerRef.current = setTimeout(() => {
        popperPointerRef.current = false
        popperPointerTimerRef.current = null
      }, 200)
    }

    // Capture phase so we see the target before Select unmounts it.
    document.addEventListener("pointerdown", markIfPopper, true)
    document.addEventListener("mousedown", markIfPopper, true)
    document.addEventListener("touchstart", markIfPopper, true)
    document.addEventListener("click", markIfPopper, true)

    return () => {
      document.removeEventListener("pointerdown", markIfPopper, true)
      document.removeEventListener("mousedown", markIfPopper, true)
      document.removeEventListener("touchstart", markIfPopper, true)
      document.removeEventListener("click", markIfPopper, true)
      if (popperPointerTimerRef.current) {
        clearTimeout(popperPointerTimerRef.current)
      }
    }
  }, [])

  const shouldKeepOpen = (event: {
    detail?: { originalEvent?: Event }
    target?: EventTarget | null
  }) => popperPointerRef.current || isFromPortaledPopper(event)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        onPointerDownOutside={(event) => {
          if (shouldKeepOpen(event)) {
            event.preventDefault()
            return
          }
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={(event) => {
          if (shouldKeepOpen(event)) {
            event.preventDefault()
            return
          }
          onInteractOutside?.(event)
        }}
        onFocusOutside={(event) => {
          // Focus moves to portaled Select/Popover content → don't dismiss.
          if (shouldKeepOpen(event) || isPortaledPopperNode(event.target)) {
            event.preventDefault()
            return
          }
          onFocusOutside?.(event)
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
