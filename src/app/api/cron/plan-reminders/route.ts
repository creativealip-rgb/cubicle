import { NextResponse } from "next/server";
import { getExpiringUsers } from "@/lib/subscription";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const expiring = await getExpiringUsers();

    for (const user of expiring) {
      // TODO: send email via Resend when production-ready
      console.log(
        `[cron/plan-reminders] user "${user.name}" (${user.id}) — plan ${user.plan} expires in ${user.daysUntilExpiry} day(s)`,
      );
    }

    return NextResponse.json({ ok: true, reminders: expiring.length, users: expiring });
  } catch (err) {
    console.error("[cron/plan-reminders] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
