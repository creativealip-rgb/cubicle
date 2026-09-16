const ACTION_LABELS: Record<string, string> = {
  "user.create": "User created",
  "user.update": "User updated",
  "user.password_reset": "Password reset",
  "user.ban": "User banned",
  "user.unban": "User unbanned",
  "user.plan_change": "Plan changed",
};

export function humanizeAuditAction(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function summarizeAuditMetadata(metadata: unknown) {
  let value = metadata;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return "No additional details"; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "No additional details";
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  const from = record.from;
  const to = record.to;
  const fromPlan = typeof from === "object" && from && !Array.isArray(from) && typeof (from as Record<string, unknown>).plan === "string" ? (from as Record<string, string>).plan : typeof from === "string" ? from : null;
  const toPlan = typeof to === "object" && to && !Array.isArray(to) && typeof (to as Record<string, unknown>).plan === "string" ? (to as Record<string, string>).plan : typeof to === "string" ? to : null;
  if (fromPlan && toPlan) parts.push(`${fromPlan} → ${toPlan}`);
  if (typeof record.reason === "string" && record.reason.trim()) parts.push(`Reason: ${record.reason}`);
  return parts.join(" · ") || "No additional details";
}

export function metadataJson(metadata: unknown) {
  try { return JSON.stringify(metadata); } catch { return "Unavailable"; }
}
