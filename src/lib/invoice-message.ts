export type InvoiceMessageInput = {
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  lang?: string;
};

export function buildDefaultInvoiceMessage(input: InvoiceMessageInput) {
  const isEn = input.lang === "en";
  const dueLine = input.dueDate
    ? isEn
      ? `\nDue date: ${input.dueDate}`
      : `\nJatuh tempo: ${input.dueDate}`
    : "";

  if (isEn) {
    return (
      `Hello ${input.clientName},\n\n` +
      `Invoice ${input.invoiceNumber} for ${input.amount} is ready.${dueLine}\n\n` +
      `Download PDF invoice:\n{{invoice_link}}\n\n` +
      `Thank you.`
    );
  }

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
