import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { createProposal } from "@/lib/actions/proposals";
import { redirect } from "next/navigation";

export default async function NewProposalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  // Auto-generate fresh draft proposal and jump directly into the 3-panel block builder
  const proposal = await createProposal({
    workspaceId,
    clientName: "Klien Baru",
    title: "Proposal Proyek",
    currency: "IDR",
    taxRate: 0,
    downPaymentPercent: 50,
    lineItems: [
      {
        description: "Layanan Utama",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ],
  });

  redirect(`/app/proposals/${proposal.id}/edit`);
}
