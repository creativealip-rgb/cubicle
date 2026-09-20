import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { togglePersonalHabitCheckin } from "@/lib/actions/personal-habits";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    requireUser(session?.user);

    const body = await req.json();
    const { habitId, date } = body;

    if (!habitId) {
      return NextResponse.json({ error: "habitId required" }, { status: 400 });
    }

    const result = await togglePersonalHabitCheckin(habitId, date);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to toggle checkin" },
      { status: 400 }
    );
  }
}
