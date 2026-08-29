import { NextResponse } from "next/server";
import { generateDueRecurringInvoices } from "@/lib/actions/recurring-invoices";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json({ ok: true, ...(await generateDueRecurringInvoices()) });
  } catch (error) {
    console.error("[cron/recurring-invoices] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
