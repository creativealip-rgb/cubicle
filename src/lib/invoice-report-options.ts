import { createHmac, timingSafeEqual } from "crypto";

export type InvoiceReportRange = { from: string; to: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeInvoiceReportRange(from: string, to: string): InvoiceReportRange {
  if (!validIsoDate(from) || !validIsoDate(to)) throw new Error("Rentang tanggal tidak valid");
  if (from > to) throw new Error("Tanggal awal harus sebelum tanggal akhir");
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (days > 366) throw new Error("Rentang tanggal maksimal 366 hari");
  return { from, to };
}

export function signInvoiceReportRange(token: string, range: InvoiceReportRange, secret: string): string {
  return createHmac("sha256", secret).update(`${token}:${range.from}:${range.to}`).digest("hex");
}

export function verifyInvoiceReportRangeSignature(
  token: string,
  range: InvoiceReportRange,
  signature: string,
  secret: string,
): boolean {
  const expected = signInvoiceReportRange(token, range, secret);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function buildInvoiceReportUrl(
  appUrl: string,
  token: string,
  range: InvoiceReportRange,
  signature?: string,
): string {
  const params = new URLSearchParams({ report: "full", invoiceToken: token, from: range.from, to: range.to });
  if (signature) params.set("signature", signature);
  return `${appUrl.replace(/\/$/, "")}/api/time/export/pdf/va-timesheet?${params.toString()}`;
}
