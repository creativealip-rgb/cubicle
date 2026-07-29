export const PROJECT_STATUS_TABS = [
  "active",
  "draft",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
] as const;

export type ProjectStatusTab = (typeof PROJECT_STATUS_TABS)[number];
export type ProjectBillingType = "fixed_price" | "hourly" | "retainer" | "package";

export function parseBillingType(raw?: string): ProjectBillingType | undefined {
  if (raw === "project") return "fixed_price";
  if (raw === "hours") return "hourly";
  return raw === "fixed_price" || raw === "hourly" || raw === "retainer" || raw === "package" ? raw : undefined;
}

export function buildProjectsHref(filters: {
  status: ProjectStatusTab;
  clientId?: string;
  billingType?: ProjectBillingType;
}): string {
  const params = new URLSearchParams();
  if (filters.status !== "active") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.billingType) params.set("billingType", filters.billingType);
  const query = params.toString();
  return query ? `/app/projects?${query}` : "/app/projects";
}
