/** Feature preview allowlist — keep small, explicit. */

const TEMPLATES_PREVIEW_EMAILS = new Set([
  "alipdevcom@gmail.com",
]);

export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

/** Templates center is "Soon" for everyone; only preview emails can open full UI. */
export function canAccessTemplatesPreview(email?: string | null): boolean {
  return TEMPLATES_PREVIEW_EMAILS.has(normalizeEmail(email));
}

export function billingTypeLabel(
  billingType: string | null | undefined,
  lang: "id" | "en" = "id",
): string {
  switch (billingType) {
    case "hours":
      return lang === "id" ? "Per Jam" : "By Hours";
    case "package":
      return lang === "id" ? "Per Paket" : "By Package";
    case "project":
    default:
      return lang === "id" ? "Per Proyek" : "By Project";
  }
}

export function billingTypeHint(
  billingType: string | null | undefined,
  lang: "id" | "en" = "id",
): string {
  switch (billingType) {
    case "hours":
      return lang === "id"
        ? "Ditagih berdasarkan jam kerja (timer / time entry)."
        : "Billed by tracked hours (timer / time entries).";
    case "package":
      return lang === "id"
        ? "Ditagih lewat paket jam / deliverable yang dipilih."
        : "Billed via the selected package (hours / deliverable).";
    case "project":
    default:
      return lang === "id"
        ? "Ditagih fixed per proyek (budget / fixed fee)."
        : "Billed fixed per project (budget / fixed fee).";
  }
}
