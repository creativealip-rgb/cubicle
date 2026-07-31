export const REPORT_TABS = ["finance", "time"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export const INVOICE_TABS = ["all", "uninvoiced", "invoiced"] as const;
export type InvoiceTab = (typeof INVOICE_TABS)[number];

export function parseReportTab(value?: string): ReportTab {
  return value === "time" ? "time" : "finance";
}

export function parseInvoiceTab(value?: string): InvoiceTab {
  return value === "uninvoiced" || value === "invoiced" ? value : "all";
}

export function withQuery(path: string, current: Record<string, string | undefined>, changes: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function parseUuidList(values: string | string[] | undefined): string[] {
  const raw = Array.isArray(values) ? values : values ? values.split(",") : [];
  return Array.from(new Set(raw.filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))));
}

export function groupEligibleTimeEntries<T extends { clientId: string | null; projectId: string | null }>(entries: T[]) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    if (!entry.clientId || !entry.projectId) continue;
    const key = `${entry.clientId}:${entry.projectId}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return Array.from(groups.values());
}
