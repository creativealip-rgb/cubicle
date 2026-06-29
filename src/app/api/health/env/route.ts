import { NextRequest, NextResponse } from "next/server";
import { getProductionEnvReport } from "@/lib/env-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = getProductionEnvReport();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
