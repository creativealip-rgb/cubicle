import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { createContract, getProposedContractNumber } from "@/lib/actions/contracts";
import { redirect } from "next/navigation";

export default async function NewContractPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const contractNumber = await getProposedContractNumber(workspaceId);

  // Auto-generate fresh draft contract and jump directly into the 3-panel block builder
  const res = await createContract({
    workspaceId,
    clientName: "Klien Baru",
    clientEmail: null,
    contractNumber: contractNumber || `CTR-${Date.now()}`,
    title: "Kontrak Kerja Sama",
    body: "## 1. Lingkup Pekerjaan\nDeskripsi lingkup pekerjaan dan deliverables...",
  });

  if ("id" in res) {
    redirect(`/app/contracts/${res.id}/edit`);
  }

  redirect("/app/contracts");
}
