import { NextResponse } from "next/server";
import { expirePlans } from "@/lib/subscription";

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
    const downgraded = await expirePlans();
    return NextResponse.json({ ok: true, downgraded: downgraded.length, workspaceIds: downgraded });
  } catch (err) {
    console.error("[cron/expire-plans] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
