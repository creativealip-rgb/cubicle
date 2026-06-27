import { NextResponse } from "next/server";
import { getExpiringWorkspaces } from "@/lib/subscription";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiring = await getExpiringWorkspaces();

    for (const ws of expiring) {
      // TODO: send email via Resend when production-ready
      console.log(
        `[cron/plan-reminders] workspace "${ws.name}" (${ws.id}) — plan ${ws.plan} expires in ${ws.daysUntilExpiry} day(s)`,
      );
    }

    return NextResponse.json({ ok: true, reminders: expiring.length, workspaces: expiring });
  } catch (err) {
    console.error("[cron/plan-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
