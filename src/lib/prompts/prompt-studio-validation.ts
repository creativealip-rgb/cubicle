import type { PromptFieldDefinition, PromptOptionValue } from "./catalog";

export type PromptStudioFormState = {
  brand: string; campaign: string; goal: string; audience: string;
  offer: string; tone: string; style: string; platform: string;
  ratio: string; colorPalette: string; notes: string;
  options: Record<string, PromptOptionValue>;
};

/**
 * Validates one field against the catalog schema rules (required, min/max,
 * select membership). Mirrors promptBriefSchema so users see the same rules
 * inline, before submit. Returns null when the field is valid.
 */
export function validateField(field: PromptFieldDefinition, rawValue: PromptOptionValue | undefined, lang: "id" | "en"): string | null {
  const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== "";
  if (field.required && !hasValue) {
    return lang === "en" ? `${field.labelEn || field.label} is required` : `${field.label} wajib diisi`;
  }
  if (!hasValue) return null;
  const numeric = typeof rawValue === "number";
  if (field.type === "number" || numeric) {
    if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
      return lang === "en" ? "Must be a number" : "Harus berupa angka";
    }
    if (field.min !== undefined && rawValue < field.min) {
      return lang === "en" ? `Minimum ${field.min}` : `Minimal ${field.min}`;
    }
    if (field.max !== undefined && rawValue > field.max) {
      return lang === "en" ? `Maximum ${field.max}` : `Maksimal ${field.max}`;
    }
  }
  if (field.options && typeof rawValue === "string" && !field.options.includes(rawValue)) {
    return lang === "en" ? "Invalid option" : "Pilihan tidak valid";
  }
  return null;
}

/** True when the user has entered any brief/detail field value. */
export function hasEnteredDetails(form: PromptStudioFormState): boolean {
  return Boolean(
    form.brand.trim() || form.campaign.trim() || form.goal.trim() || form.audience.trim() ||
    form.offer.trim() || form.tone || form.style || form.platform || form.ratio ||
    form.colorPalette.trim() || form.notes.trim() ||
    Object.values(form.options).some((value) => value !== undefined && value !== null && value !== "")
  );
}
