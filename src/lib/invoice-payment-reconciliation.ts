type WorkflowStatus = "draft" | "sent" | "viewed" | "overdue" | "cancelled" | "archived" | "partial" | "paid";

export function reconcileInvoicePaymentState({ total, paid, workflowStatus }: {
  total: number;
  paid: number;
  workflowStatus: WorkflowStatus;
}) {
  const totalCents = Math.round(total * 100);
  const paidCents = Math.round(paid * 100);
  if (paidCents > totalCents) throw new Error("Recorded payments exceed invoice total");
  if (paidCents === totalCents && totalCents > 0) return { paymentState: "paid" as const, status: "paid" as const, remaining: 0 };
  if (paidCents > 0) {
    const status = workflowStatus === "paid" || workflowStatus === "partial" ? "sent" : workflowStatus;
    return { paymentState: "partial" as const, status, remaining: (totalCents - paidCents) / 100 };
  }
  const status = workflowStatus === "paid" || workflowStatus === "partial" ? "sent" : workflowStatus;
  return { paymentState: "unpaid" as const, status, remaining: totalCents / 100 };
}
