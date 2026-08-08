const FINAL_INVOICE_STATUSES = new Set([
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
  "archived",
]);

/**
 * Allowed status transitions for the manual updateInvoice edit path.
 * - Same-status saves are no-ops and always allowed.
 * - paid/cancelled/archived are terminal: nothing may leave them.
 * - draft -> cancelled is intentionally excluded — it is delegated to the
 *   dedicated cancelDraftInvoice action (which also reverts time entries).
 * - sent -> viewed/overdue and viewed -> overdue are allowed here for manual
 *   corrections, but the canonical sources are the client portal and the
 *   overdue cron (markOverdueInvoices) which mutate status outside updateInvoice.
 */
const INVOICE_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  draft: new Set(["draft", "sent", "viewed", "paid", "overdue", "archived"]),
  sent: new Set(["sent", "viewed", "paid", "overdue", "archived"]),
  viewed: new Set(["viewed", "paid", "overdue", "archived"]),
  overdue: new Set(["overdue", "paid", "archived"]),
  paid: new Set(["paid"]),
  cancelled: new Set(["cancelled"]),
  archived: new Set(["archived"]),
};

export function isInvoiceStatusTransitionAllowed(from: string, to: string): boolean {
  const allowed = INVOICE_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

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
