export const ALLOWED_ANALYTICS_EVENTS = ["landing_viewed", "signup_started", "signup_completed", "activation_client_created", "activation_project_created", "activation_meaningful_activity"] as const;
export type AnalyticsEventName = typeof ALLOWED_ANALYTICS_EVENTS[number];
const SAFE = new Set(["content", "term", "landingPath", "source", "medium", "campaign", "referrer", "referralId"]);
export function sanitizeAnalyticsMetadata(input: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => SAFE.has(key) && typeof value === "string" && value.length <= 200));
}
export function classifyAttribution(input: { source?: string; medium?: string; referralId?: string }) {
  if (input.referralId) return "referral" as const;
  if (input.source && input.medium === "organic") return "organic" as const;
  if (input.source || input.medium) return "campaign" as const;
  return "unknown" as const;
}

export const ANALYTICS_COOKIE = "cubiqlo_visitor_id";
export function anonymousId() { return crypto.randomUUID(); }
