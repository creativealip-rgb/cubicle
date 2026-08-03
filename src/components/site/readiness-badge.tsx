"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import {
  countReadinessIssues,
  getPersonalSiteReadiness,
  isReadyToPublish,
  type ReadinessIssue,
} from "@/lib/personal-site/readiness";

/**
 * Phase 6 (Task 6.2) — publish readiness UI helpers.
 *
 * Pure presentation helpers are exported alongside the React component so the
 * readiness status logic can be unit-tested without a DOM. The component is a
 * thin shell over these helpers, so what the tests assert is exactly what the
 * badge shows in the builder.
 */

export type ReadinessPreview = {
  ready: boolean;
  errors: number;
  warnings: number;
  total: number;
  issues: ReadinessIssue[];
};

/**
 * Evaluates a site for publish readiness and summarizes the result.
 * Pure — safe to call from tests and from React memoization.
 */
export function computeReadinessPreview(site: PersonalSiteInput): ReadinessPreview {
  const issues = getPersonalSiteReadiness(site);
  const { errors, warnings } = countReadinessIssues(issues);
  const ready = isReadyToPublish(issues);
  return { ready, errors, warnings, total: errors + warnings, issues };
}

/**
 * Badge copy: "Ready to publish" when there are no errors, otherwise
 * "<N> things to fix". Bilingual via useT() at the call site; this helper
 * returns the language-neutral shape so tests can assert on it.
 */
export function readinessStatusLabel(preview: ReadinessPreview, readyLabel = "Ready to publish", fixLabel = "things to fix"): string {
  if (preview.ready) return readyLabel;
  return `${preview.total} ${fixLabel}`;
}

/**
 * Groups issues by severity with errors first, keeping the original order
 * within each severity — stable output for accessible lists.
 */
export function groupReadinessIssues(issues: ReadinessIssue[]): { errors: ReadinessIssue[]; warnings: ReadinessIssue[] } {
  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
}

type ReadinessBadgeProps = {
  site: PersonalSiteInput;
  /**
   * Optional translation function so the badge follows the app's
   * bilingual pattern without importing the i18n client itself.
   */
  t?: (id: string, fallback: string) => string;
};

/**
 * Live publish-readiness badge for the landing builder bottom bar.
 *
 * - Reads from the live (dirty) site state on every render — the badge
 *   updates as the user types/edits; it never reads the saved snapshot.
 * - Renders no site fields of its own, so it cannot conflict with the
 *   device switcher, properties panel, or mobile layout: it only adds a
 *   small status control next to them.
 * - Click toggles an accessible issue panel with severity labels
 *   (errors listed first, each item labelled with its user-friendly copy).
 */
export function ReadinessBadge({ site, t = (_id, fallback) => fallback }: ReadinessBadgeProps) {
  const preview = useMemo(() => computeReadinessPreview(site), [site]);
  const grouped = useMemo(() => groupReadinessIssues(preview.issues), [preview.issues]);
  const [open, setOpen] = useState(false);

  const statusLabel = readinessStatusLabel(
    preview,
    t("readiness.ready", "Ready to publish"),
    t("readiness.thingsToFix", "things to fix"),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-muted/50 ${
          preview.ready
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:text-amber-800"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="readiness-issues-panel"
        title={statusLabel}
      >
        {preview.ready ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        )}
        <span role="status" aria-live="polite">
          {statusLabel}
        </span>
      </button>

      {open && (
        <div
          id="readiness-issues-panel"
          role="dialog"
          aria-label={t("readiness.panelTitle", "Publish readiness")}
          className="absolute bottom-full left-1/2 z-40 mb-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {preview.ready
                ? t("readiness.ready", "Ready to publish")
                : `${preview.total} ${t("readiness.thingsToFix", "things to fix")}`}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label={t("readiness.close", "Close readiness panel")}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {preview.ready ? (
            <p className="text-xs text-emerald-700">
              {t("readiness.noIssues", "Tidak ada masalah — halaman siap dipublikasikan.")}
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {grouped.errors.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold text-red-700" role="heading" aria-level={3}>
                    {grouped.errors.length} {t("readiness.errors", "errors")}
                  </p>
                  <ul aria-label={t("readiness.errorList", "Errors to fix before publishing")} className="space-y-1">
                    {grouped.errors.map((issue) => (
                      <li key={issue.id} className="rounded border border-red-200 bg-red-50 p-1.5 text-xs text-red-700">
                        <span className="font-medium" aria-label={t("readiness.severityError", "Error")}>
                          [ERROR]
                        </span>{" "}
                        {issue.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {grouped.warnings.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold text-amber-700" role="heading" aria-level={3}>
                    {grouped.warnings.length} {t("readiness.warnings", "warnings")}
                  </p>
                  <ul aria-label={t("readiness.warningList", "Warnings — recommended fixes")} className="space-y-1">
                    {grouped.warnings.map((issue) => (
                      <li key={issue.id} className="rounded border border-amber-200 bg-amber-50 p-1.5 text-xs text-amber-800">
                        <span className="font-medium" aria-label={t("readiness.severityWarning", "Warning")}>
                          [WARN]
                        </span>{" "}
                        {issue.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
