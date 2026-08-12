import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { proposals, clients, workspaces, workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { renderProposalPdf } from "@/lib/pdf/proposal-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [p] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!p) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Workspace membership check (any role can read; PDF is a view op)
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, p.workspaceId),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }

  const [client] = p.clientId ? await db
    .select()
    .from(clients)
    .where(eq(clients.id, p.clientId))
    .limit(1) : [null];
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, p.workspaceId))
    .limit(1);

  const data = {
    proposal: {
      title: p.title,
      status: p.status,
      body: p.body || null,
      contentBlocks: p.contentBlocks,
      lineItems: p.lineItems,
      subtotal: p.subtotal,
      tax: p.tax,
      total: p.total,
      currency: p.currency,
      downPaymentPercent: p.downPaymentPercent,
      validUntil: p.validUntil ? new Date(p.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null,
      sentAt: p.sentAt ? new Date(p.sentAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null,
    },
    workspace: {
      name: ws?.name || "Cubiqlo",
      billingName: ws?.billingName ?? null,
      billingAddress: ws?.billingAddress ?? null,
    },
    client: {
      name: client?.name || p.clientName || "Unknown",
      email: client?.email ?? p.clientEmail ?? null,
      companyName: client?.companyName ?? p.companyName ?? null,
    },
  };

  const buf = await renderProposalPdf(data);
  const safeTitle = p.title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposal-${safeTitle}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
