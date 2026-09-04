export const PROJECT_STATUS_TABS = ["active", "on_hold", "completed"] as const;

export type ProjectStatusTab = (typeof PROJECT_STATUS_TABS)[number];
export type ProjectBillingType = "fixed_price" | "hourly" | "retainer" | "package";

/** Status values grouped under each tab. Legacy "draft"/"review" fold into "active". */
export const PROJECT_STATUS_TAB_VALUES: Record<ProjectStatusTab, readonly string[]> = {
  active: ["active", "draft", "review"],
  on_hold: ["on_hold"],
  completed: ["completed"],
};

export function parseBillingType(raw?: string): ProjectBillingType | undefined {
  if (raw === "project") return "fixed_price";
  if (raw === "hours") return "hourly";
  return raw === "fixed_price" || raw === "hourly" || raw === "retainer" || raw === "package" ? raw : undefined;
}

export function buildProjectsHref(filters: {
  status: ProjectStatusTab;
  clientId?: string;
  billingType?: ProjectBillingType;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.status !== "active") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.billingType) params.set("billingType", filters.billingType);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/app/projects?${query}` : "/app/projects";
}
