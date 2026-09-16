export const GROWTH_RANGES = ["7d", "30d", "90d", "12m"] as const;
export type GrowthRange = (typeof GROWTH_RANGES)[number];

export type MetricValue = { status: "available"; value: number } | { status: "unavailable"; reason: string };
export type ActivationCounts = { clients: number; projects: number; tasks: number; invoices: number; timeEntries: number; portalVisits: number };

export function getRangeWindow(range: GrowthRange, end = new Date()) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  return { start: new Date(end.getTime() - days * 86400000), end, days };
}

export function activationRequirementsMet(counts: ActivationCounts) {
  return counts.clients > 0 && counts.projects > 0 && (counts.tasks > 0 || counts.invoices > 0 || counts.timeEntries > 0 || counts.portalVisits > 0);
}

export function comparePercent(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
}

export function moneyMetrics(mrr: number, arr: number, paidAccounts: number) {
  return { mrr, arr, arpu: paidAccounts > 0 ? Math.round((mrr / paidAccounts) * 100) / 100 : null };
}

export function unavailableMetric(reason: string): MetricValue { return { status: "unavailable", reason }; }
export function parseGrowthRange(value: string | undefined): GrowthRange { return GROWTH_RANGES.includes(value as GrowthRange) ? value as GrowthRange : "30d"; }
