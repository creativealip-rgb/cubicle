const ACTION_LABELS: Record<string, string> = {
  "user.create": "User created",
  "user.update": "User updated",
  "user.password_reset": "Password reset",
  "user.ban": "User banned",
  "user.unban": "User unbanned",
  "user.plan_change": "Plan changed",
  "user.mfa_enable": "MFA enabled",
  "user.mfa_disable": "MFA disabled",
  "user.marketing_opt_in": "Marketing opted in",
  "user.marketing_opt_out": "Marketing opted out",
};

export function humanizeAuditAction(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return null;
  return String(value);
}

export function summarizeAuditMetadata(metadata: unknown) {
  let value = metadata;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return "No additional details"; }
  }
  const record = object(value);
  if (!record) return "No additional details";
  const parts: string[] = [];
  const from = object(record.from);
  const to = object(record.to);
  const fromValue = safeValue(from?.plan ?? from?.value ?? record.from);
  const toValue = safeValue(to?.plan ?? to?.value ?? record.to);
  if (fromValue && toValue) parts.push(`${fromValue} → ${toValue}`);
  for (const key of ["name", "email", "role", "status", "enabled", "marketing", "reason"]) {
    const label = key === "reason" ? "Reason" : key[0].toUpperCase() + key.slice(1);
    const value = safeValue(record[key]);
    if (value && !parts.some((part) => part.includes(`${label}:`))) parts.push(`${label}: ${value}`);
  }
  return parts.join(" · ") || "No additional details";
}

const SECRET_KEY = /password|secret|token|api[_-]?key|authorization|cookie|session/i;
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, SECRET_KEY.test(key) ? "[redacted]" : redact(child)]));
}

export function metadataJson(metadata: unknown) {
  try { return JSON.stringify(redact(typeof metadata === "string" ? JSON.parse(metadata) : metadata), null, 2); } catch { return "Unavailable"; }
}

export function auditDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}
