export type ProjectServiceSnapshot = {
  id: string;
  nameSnapshot: string;
  descriptionSnapshot: string | null;
  quantity: string;
  unitPrice: string | null;
  amount: string | null;
  currencySnapshot: string;
  status: "active" | "archived";
};

export type ProjectServiceDocumentLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sourceType: "project_service";
  sourceId: string;
  originalCurrency: string;
  originalAmount: number;
};

export function buildProjectServiceDocumentLines(rows: ProjectServiceSnapshot[], targetCurrency: string): ProjectServiceDocumentLine[] {
  return rows.filter((row) => row.status === "active").map((row) => {
    if (row.currencySnapshot !== targetCurrency) {
      throw new Error(`Kurs Project Service ${row.currencySnapshot} ke ${targetCurrency} belum tersedia`);
    }
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unitPrice ?? 0);
    const amount = row.amount == null ? quantity * unitPrice : Number(row.amount);
    return {
      description: row.descriptionSnapshot ? `${row.nameSnapshot} — ${row.descriptionSnapshot}` : row.nameSnapshot,
      quantity,
      unitPrice,
      amount,
      sourceType: "project_service",
      sourceId: row.id,
      originalCurrency: row.currencySnapshot,
      originalAmount: amount,
    };
  });
}
