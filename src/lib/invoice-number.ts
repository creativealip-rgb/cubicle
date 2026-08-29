const INVOICE_NUMBER_CONSTRAINT = "invoices_workspace_id_invoice_number_unique";

export function normalizeInvoiceNumber(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized.length > 100 || /[^\x20-\x7E]/.test(normalized)) {
    throw new Error("Nomor invoice harus berupa teks yang dapat dicetak dan maksimal 100 karakter / Invoice number must be printable text and at most 100 characters");
  }
  return normalized;
}

export function invoiceNumberTakenMessage(number: string): string {
  return `Nomor invoice ${number} sudah dipakai di workspace ini / Invoice number ${number} already exists in this workspace`;
}

export function isInvoiceNumberUniqueConstraint(error: unknown): boolean {
  const cause = error as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
  const code = cause?.cause?.code ?? cause?.code;
  const constraint = cause?.cause?.constraint ?? cause?.constraint;
  return constraint === INVOICE_NUMBER_CONSTRAINT && (code === undefined || code === "23505");
}
