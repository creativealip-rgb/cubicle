import { createHash } from "node:crypto";
import type { BillingModel } from "@/lib/billing-model";

export type TemplateTarget = "fixed_price" | "hourly_retainer" | "all";

export function isTaskTemplateTargetCompatible(target: TemplateTarget, model: BillingModel) {
  if (target === "all") return model !== "legacy_package";
  if (target === "fixed_price") return model === "fixed_price";
  return model === "hourly" || model === "retainer";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalTaskTemplateImportFingerprint(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
