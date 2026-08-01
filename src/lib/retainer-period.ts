export type RetainerPeriodRange = { start: string; end: string };
export type RetainerUsage = { approvedMinutes: number; overageMinutes: number };
export type RetainerInvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};
export type RetainerPeriodUsageSummary = {
  period: string;
  fee: number;
  includedHours: number;
  approvedUsedHours: number;
  overageHours: number;
  overageValue: number | null;
};

function parseIsoDate(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) throw new Error("Tanggal periode harus YYYY-MM-DD");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function getRetainerPeriodRange(workDate: string, resetDay: number): RetainerPeriodRange {
  if (!Number.isInteger(resetDay) || resetDay < 1 || resetDay > 28) {
    throw new Error("Reset day Retainer harus 1–28");
  }

  const date = parseIsoDate(workDate);
  const candidateStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), resetDay));
  const start = date.getTime() < candidateStart.getTime() ? addMonths(candidateStart, -1) : candidateStart;
  const end = addMonths(start, 1);

  return { start: formatIsoDate(start), end: formatIsoDate(end) };
}

export function calculateRetainerUsage(input: { approvedMinutes: number[]; includedMinutes: number }): RetainerUsage {
  const approvedMinutes = input.approvedMinutes.reduce((sum, minutes) => sum + Math.max(0, Math.trunc(minutes)), 0);
  const includedMinutes = Math.max(0, Math.trunc(input.includedMinutes));
  return { approvedMinutes, overageMinutes: Math.max(0, approvedMinutes - includedMinutes) };
}

export function getRetainerPeriodUsageSummary(input: {
  periodStart: string; periodEnd: string; fee: number; includedMinutes: number;
  approvedMinutes: number; overageMinutes: number; overagePolicy: string; overageRate?: number | null;
}): RetainerPeriodUsageSummary {
  const rate = input.overageRate ?? 0;
  return {
    period: `${input.periodStart}–${input.periodEnd}`,
    fee: input.fee,
    includedHours: input.includedMinutes / 60,
    approvedUsedHours: input.approvedMinutes / 60,
    overageHours: input.overageMinutes / 60,
    overageValue: input.overagePolicy === "bill" && rate > 0 ? (input.overageMinutes / 60) * rate : null,
  };
}

export function buildRetainerInvoiceLines(input: {
  fee: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  overagePolicy: string;
  overageMinutes: number;
  overageRate?: number | null;
}): RetainerInvoiceLine[] {
  const lines: RetainerInvoiceLine[] = [{
    description: `Retainer ${input.periodStart}–${input.periodEnd}`,
    quantity: 1,
    unitPrice: input.fee,
    amount: input.fee,
  }];

  if (input.overagePolicy === "bill" && input.overageMinutes > 0) {
    const rate = input.overageRate ?? 0;
    if (rate <= 0) throw new Error("Rate overage Retainer wajib positif");
    const hours = input.overageMinutes / 60;
    lines.push({
      description: `Retainer overage ${Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)))} jam`,
      quantity: hours,
      unitPrice: rate,
      amount: hours * rate,
    });
  }

  return lines;
}
