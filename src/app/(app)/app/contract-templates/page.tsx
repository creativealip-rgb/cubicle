import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contractTemplates, workspaces, contracts } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Star } from "lucide-react";

async function getWorkspace() {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws;
}

export default async function ContractTemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  const member = await assertWorkspaceMember(db, user.id, ws.id);
  const canWrite = member.role === "owner" || member.role === "member";

  const rows = await db
    .select({
      id: contractTemplates.id,
      name: contractTemplates.name,
      body: contractTemplates.body,
      isDefault: contractTemplates.isDefault,
      createdAt: contractTemplates.createdAt,
      updatedAt: contractTemplates.updatedAt,
    })
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, ws.id))
    .orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.updatedAt));

  // Count contracts per template
  const usageCounts: Record<string, number> = {};
  for (const t of rows) {
    const result = await db
      .select({ c: count() })
      .from(contracts)
      .where(eq(contracts.templateId, t.id));
    usageCounts[t.id] = Number(result[0]?.c ?? 0);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contract templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reusable contract bodies with <code className="text-xs bg-slate-100 px-1 rounded">&#123;&#123;client.name&#125;&#125;</code> placeholders. Auto-filled at send time.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/app/contract-templates/new">
              <Plus className="h-4 w-4 mr-1" />
              New template
            </Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">No templates yet. Build one to reuse contract bodies for clients.</p>
          {canWrite && (
            <Button asChild>
              <Link href="/app/contract-templates/new">
                <Plus className="h-4 w-4 mr-1" />
                Create first template
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used by</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Link
                      href={`/app/contract-templates/${t.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.body.slice(0, 80)}…</p>
                  </TableCell>
                  <TableCell>
                    {t.isDefault && (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {usageCounts[t.id]} contract{usageCounts[t.id] === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {t.updatedAt ? new Date(t.updatedAt as unknown as string | number | Date).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
