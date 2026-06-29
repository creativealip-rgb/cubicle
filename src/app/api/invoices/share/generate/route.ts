import { randomBytes, createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

export async function GET(req: NextRequest) {
  const invoiceId = req.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: req.headers });
  const user = requireUser(session?.user);

  const [invoice] = await db
    .select({ workspaceId: invoices.workspaceId })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await assertWorkspaceWritable(db, user.id, invoice.workspaceId);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await db
    .update(invoices)
    .set({
      sharedTokenHash: tokenHash,
      sharedTokenExpiresAt: expiry,
      sharedTokenRevokedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, invoice.workspaceId)));

  await writeActivityLog(invoice.workspaceId, user.id, "generated_invoice_share_token", "invoice", invoiceId);

  const url = new URL(`/app/invoices/${invoiceId}`, req.url);
  url.searchParams.set("shareToken", rawToken);
  return NextResponse.redirect(url, 303);
}
