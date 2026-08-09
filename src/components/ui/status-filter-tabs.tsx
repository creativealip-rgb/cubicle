"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type StatusFilterTab = {
  value: string;
  label: string;
  href: string;
  count?: number;
  /** Keep visible even when count is 0 and inactive. Default: true for value "all". */
  alwaysShow?: boolean;
};

type StatusFilterTabsProps = {
  tabs: StatusFilterTab[];
  activeValue: string;
  className?: string;
  listClassName?: string;
  /** Hide inactive zero-count tabs unless alwaysShow. Default true. */
  hideEmpty?: boolean;
};

/**
 * Shared status filter pills — same look as /app/projects:
 * muted track, white active pill, purple count badge when active.
 *
 * Plain links (no Radix Tabs) so active state always matches URL,
 * even with Next.js Link soft nav / SSR.
 */
export function StatusFilterTabs({
  tabs,
  activeValue,
  className,
  listClassName,
  hideEmpty = true,
}: StatusFilterTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const visible = tabs.filter((tab) => {
    const active = tab.value === activeValue;
    if (active) return true;
    if (!hideEmpty) return true;
    if (tab.alwaysShow) return true;
    if (tab.value === "all") return true;
    if (typeof tab.count === "number" && tab.count === 0) return false;
    return true;
  });

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? visible.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + visible.length) % visible.length;
    tablistRef.current?.querySelector<HTMLAnchorElement>(`[data-status-tab-index="${nextIndex}"]`)?.focus();
  }

  return (
    <div
      role="tablist"
      ref={tablistRef}
      aria-orientation="horizontal"
      className={cn(
        "inline-flex h-auto w-full items-center justify-start overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground lg:w-auto",
        listClassName,
        className,
      )}
    >
      {visible.map((tab, index) => {
        const active = tab.value === activeValue;
        const hasCount = typeof tab.count === "number";
        return (
          <Link
            key={tab.value}
            href={tab.href}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-status-tab-index={index}
            onKeyDown={(event) => handleKeyDown(event, index)}
            data-state={active ? "active" : "inactive"}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            {hasCount ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-background/80 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
