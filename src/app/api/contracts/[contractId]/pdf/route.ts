import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { contracts, clients, workspaces, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { renderContractPdf } from "@/lib/pdf/contract-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [c] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!c) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  // Workspace membership check (any role can read; PDF is a view op)
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, c.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, c.clientId))
    .limit(1);
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, c.workspaceId))
    .limit(1);

  const data = {
    contract: {
      title: c.title,
      status: c.status,
      body: c.bodyResolved || c.body || "",
      validUntil: c.validUntil ? new Date(c.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null,
      sentAt: c.sentAt ? new Date(c.sentAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null,
      signedAt: c.signedAt ? new Date(c.signedAt).toLocaleString("id-ID") : null,
      signedName: c.signedName,
      signedEmail: c.signedEmail,
      signatureDataUrl: c.signatureDataUrl,
      signedFromIp: c.signedFromIp,
      declineReason: c.declineReason,
    },
    workspace: {
      name: ws?.name || "Cubicle",
      billingName: ws?.billingName ?? null,
      billingAddress: ws?.billingAddress ?? null,
    },
    client: {
      name: client?.name || "Unknown",
      email: client?.email ?? null,
      companyName: client?.companyName ?? null,
    },
  };

  const buf = await renderContractPdf(data);
  const safeTitle = c.title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contract-${safeTitle}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
