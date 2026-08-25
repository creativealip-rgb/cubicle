const INVOICE_NUMBER_PATTERN = /^INV-[A-Z0-9-]{1,47}$/;

export function normalizeInvoiceNumber(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized.length > 50 || !INVOICE_NUMBER_PATTERN.test(normalized)) {
    throw new Error("Nomor invoice harus berformat INV-... dan maksimal 50 karakter / Invoice number must use INV-... format and be at most 50 characters");
  }
  return normalized;
}

export function invoiceNumberTakenMessage(number: string): string {
  return `Nomor invoice ${number} sudah dipakai di workspace ini / Invoice number ${number} already exists in this workspace`;
}

export function isInvoiceNumberUniqueConstraint(error: unknown): boolean {
  const cause = error as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
  return (cause?.cause?.code ?? cause?.code) === "23505" ||
    (cause?.cause?.constraint ?? cause?.constraint) === "invoices_workspace_id_invoice_number_unique";
}
