import { NextResponse } from "next/server";
import { expirePlans } from "@/lib/subscription";
import { sweepStorageAddons } from "@/lib/storage-addons";
import { sweepExtraWorkspaceEntitlementsTx } from "@/lib/extra-workspace";
import { db } from "@/db";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const downgraded = await expirePlans();
    const [storage, workspace] = await Promise.all([
      sweepStorageAddons(),
      db.transaction(async (tx) => sweepExtraWorkspaceEntitlementsTx(tx)),
    ]);
    return NextResponse.json({
      ok: true,
      downgraded: downgraded.length,
      workspaceIds: downgraded,
      storage,
      extraWorkspace: workspace,
    });
  } catch (err) {
    console.error("[cron/expire-plans] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}