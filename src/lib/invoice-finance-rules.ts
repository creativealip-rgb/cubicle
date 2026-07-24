const FINAL_INVOICE_STATUSES = new Set(["paid", "cancelled", "archived"]);

function safeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateInvoiceTotals(
  subtotalValue: number,
  discountValue: number,
  taxValue: number,
) {
  const subtotal = safeMoney(subtotalValue);
  const discount = Math.min(safeMoney(discountValue), subtotal);
  const tax = safeMoney(taxValue);

  return {
    subtotal,
    discount,
    tax,
    total: Math.max(0, subtotal - discount + tax),
  };
}

export function assertInvoiceFinancialsMutable(status: string) {
  if (FINAL_INVOICE_STATUSES.has(status)) {
    throw new Error("Invoice final tidak dapat mengubah rincian finansial");
  }
}

export function isInvoiceFinancialsMutable(status: string) {
  return !FINAL_INVOICE_STATUSES.has(status);
}
