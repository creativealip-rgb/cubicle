import type { ReactNode } from "react";

const cx = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(" ");

export type BuilderShellProps = {
  header?: ReactNode;
  leftRail?: ReactNode;
  canvas: ReactNode;
  rightRail?: ReactNode;
  mobileDrawer?: ReactNode;
  previewMode?: boolean;
  className?: string;
};

export function BuilderShell({ header, leftRail, canvas, rightRail, mobileDrawer, previewMode = false, className }: BuilderShellProps) {
  return (
    <div
      className={cx("flex h-full min-h-0 flex-col", className)}
      data-testid="builder-shell"
      data-builder-shell
      data-preview-mode={previewMode}
    >
      {header}
      <div className="flex min-h-0 flex-1">
        {leftRail}
        {canvas}
        {rightRail}
      </div>
      {mobileDrawer}
    </div>
  );
}

export function BuilderWorkflowHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cx("flex h-14 shrink-0 items-center border-b bg-background px-4", className)}>{children}</header>;
}

export function BuilderCanvasViewport({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx("min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden", className)}>{children}</main>;
}

export function BuilderRail({
  children,
  side,
  widthClass = "w-64",
  className,
}: {
  children: ReactNode;
  side: "left" | "right";
  widthClass?: string;
  className?: string;
}) {
  return (
    <aside
      aria-label={side === "left" ? "Left builder tools" : "Properties"}
      className={cx("min-h-0 shrink-0 overflow-y-auto bg-background", widthClass, side === "left" ? "border-r" : "border-l", className)}
    >
      {children}
    </aside>
  );
}

/** Mobile-only drawer. Hidden at `md` and up by default; override via className if a consumer needs it on desktop. */
export function BuilderMobileDrawer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-label="Mobile builder tools" role="dialog" className={cx("md:hidden", className)}>
      {children}
    </div>
  );
}

// ponytail: shell owns layout only; add state/context when consumers need shared workflow state.
