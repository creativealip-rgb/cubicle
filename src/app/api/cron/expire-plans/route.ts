import { NextResponse } from "next/server";
import { expirePlans } from "@/lib/subscription";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const downgraded = await expirePlans();
    return NextResponse.json({ ok: true, downgraded: downgraded.length, workspaceIds: downgraded });
  } catch (err) {
    console.error("[cron/expire-plans] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
