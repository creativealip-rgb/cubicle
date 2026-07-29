/** Feature preview allowlist — keep small, explicit. */

const TEMPLATES_PREVIEW_EMAILS = new Set([
  "alipdevcom@gmail.com",
]);

export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

/** Templates center is "Soon" for everyone; only preview emails can open full UI. */
export function canAccessTemplatesPreview(
  email?: string | null,
  environment = process.env.CUBIQLO_ENV,
): boolean {
  const normalized = normalizeEmail(email);
  return environment === "development" || TEMPLATES_PREVIEW_EMAILS.has(normalized);
}

export function billingTypeLabel(
  billingType: string | null | undefined,
  lang: "id" | "en" = "id",
): string {
  switch (billingType) {
    case "fixed_price":
    case "project":
      return lang === "id" ? "Fixed Price" : "Fixed Price";
    case "hours":
      return lang === "id" ? "Per Jam" : "By Hours";
    case "package":
      return lang === "id" ? "Per Paket" : "By Package";
    default:
      return lang === "id" ? "Fixed Price" : "Fixed Price";
  }
}

export function billingTypeHint(
  billingType: string | null | undefined,
  lang: "id" | "en" = "id",
): string {
  switch (billingType) {
    case "fixed_price":
    case "project":
      return lang === "id"
        ? "Ditagih fixed rate sesuai nilai project."
        : "Billed at a fixed rate for the project scope.";
    case "hours":
      return lang === "id"
        ? "Ditagih berdasarkan jam kerja (timer / time entry)."
        : "Billed by tracked hours (timer / time entries).";
    case "package":
      return lang === "id"
        ? "Ditagih lewat paket jam / deliverable yang dipilih."
        : "Billed via the selected package (hours / deliverable).";
    default:
      return lang === "id"
        ? "Ditagih fixed rate sesuai nilai project."
        : "Billed at a fixed rate for the project scope.";
  }
}
