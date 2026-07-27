export type InvoiceMessageInput = {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
};

export function buildDefaultInvoiceMessage(input: InvoiceMessageInput) {
  const dueLine = input.dueDate ? `\nJatuh tempo: ${input.dueDate}` : "";

  return (
    `Halo ${input.clientName},\n\n` +
    `Invoice ${input.invoiceNumber} sebesar ${input.amount} sudah siap.${dueLine}\n\n` +
    `Unduh PDF invoice:\n{{invoice_link}}\n\n` +
    `Terima kasih.`
  );
}

export function validateInvoiceMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Body pesan wajib diisi");
  if (trimmed.length > 10000) throw new Error("Body pesan maksimal 10.000 karakter");
  return trimmed;
}
