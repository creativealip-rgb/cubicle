import { NextResponse } from "next/server";
import { markOverdueInvoices } from "@/lib/actions/invoices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await markOverdueInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/invoice-overdue] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
