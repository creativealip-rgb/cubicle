import { NextRequest, NextResponse } from "next/server";
import { generateInvoiceShareToken } from "@/lib/actions/invoices";

export async function GET(req: NextRequest) {
  const invoiceId = req.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  await generateInvoiceShareToken(invoiceId);
  return NextResponse.redirect(new URL(`/app/invoices/${invoiceId}`, req.url), 303);
}
