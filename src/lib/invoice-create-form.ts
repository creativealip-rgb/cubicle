export function addDaysToIsoDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calculateDraftItemsSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}
