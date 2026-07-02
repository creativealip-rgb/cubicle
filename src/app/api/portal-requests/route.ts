import { NextRequest, NextResponse } from "next/server";
import { createPortalRequest, updatePortalRequestAdmin } from "@/lib/actions/portal-requests";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await createPortalRequest(body);
    return NextResponse.json({ row });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create portal request" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const row = await updatePortalRequestAdmin(body);
    return NextResponse.json({ row });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update portal request" },
      { status: 400 },
    );
  }
}
