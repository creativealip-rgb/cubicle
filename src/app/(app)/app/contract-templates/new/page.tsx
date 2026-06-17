import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { ContractTemplateBuilder } from "@/components/contracts/contract-template-builder";

export default async function NewContractTemplatePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  await assertWorkspaceWritable(db, user.id, ws.id);

  return <ContractTemplateBuilder workspaceId={ws.id} />;
}
