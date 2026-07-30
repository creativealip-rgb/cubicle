import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function safeEqual(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 })
      : null;
  }
  const authorization = request.headers.get("authorization") ?? "";
  return safeEqual(authorization, `Bearer ${secret}`)
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
