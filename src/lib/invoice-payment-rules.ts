export function getInvoicePaymentState(total: number, paid: number) {
  const safeTotal = Math.max(0, total);
  const safePaid = Math.max(0, paid);
  const remaining = Math.max(0, safeTotal - safePaid);

  return {
    paid: safePaid,
    remaining,
    fullyPaid: safeTotal > 0 && remaining <= 0.000001,
  };
}

export function assertPaymentWithinRemaining(
  amount: number,
  total: number,
  paid: number,
) {
  const { remaining } = getInvoicePaymentState(total, paid);

  if (remaining <= 0.000001) {
    throw new Error("Invoice sudah tidak memiliki sisa pembayaran");
  }

  if (amount - remaining > 0.000001) {
    throw new Error("Pembayaran melebihi sisa invoice");
  }
}
