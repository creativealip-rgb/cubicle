import type { ReactNode } from "react";

export type BuilderShellProps = {
  header?: ReactNode;
  leftRail?: ReactNode;
  canvas: ReactNode;
  rightRail?: ReactNode;
  mobileDrawer?: ReactNode;
  previewMode?: boolean;
};

export function BuilderShell({ header, leftRail, canvas, rightRail, mobileDrawer, previewMode = false }: BuilderShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="builder-shell" data-builder-shell data-preview-mode={previewMode}>
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

export function BuilderWorkflowHeader({ children }: { children: ReactNode }) {
  return <header className="flex h-14 shrink-0 items-center border-b bg-background px-4">{children}</header>;
}

export function BuilderCanvasViewport({ children }: { children: ReactNode }) {
  return <main className="min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>;
}

export function BuilderRail({ children, side, widthClass = "w-64" }: { children: ReactNode; side: "left" | "right"; widthClass?: string }) {
  return (
    <aside
      aria-label={side === "left" ? "Left builder tools" : "Properties"}
      className={`min-h-0 shrink-0 overflow-y-auto bg-background ${widthClass} ${side === "left" ? "border-r" : "border-l"}`}
    >
      {children}
    </aside>
  );
}

export function BuilderMobileDrawer({ children }: { children: ReactNode }) {
  return <div aria-label="Mobile builder tools" role="dialog">{children}</div>;
}

// ponytail: shell owns layout only; add state/context when consumers need shared workflow state.
