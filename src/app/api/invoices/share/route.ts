import { NextRequest, NextResponse } from "next/server";
import { generateInvoiceShareToken, revokeInvoiceShareToken } from "@/lib/actions/invoices";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const action = String(formData.get("action") ?? "generate");

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  if (action === "revoke") {
    await revokeInvoiceShareToken(invoiceId);
  } else {
    await generateInvoiceShareToken(invoiceId);
  }

  return NextResponse.redirect(new URL(`/app/invoices/${invoiceId}`, req.url), 303);
}
