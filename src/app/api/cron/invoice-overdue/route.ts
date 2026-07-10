import { NextResponse } from "next/server";
import { markOverdueInvoices } from "@/lib/actions/invoices";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await markOverdueInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/invoice-overdue] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
