import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorkspaceDetail } from "@/lib/actions/admin/workspaces";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const data = await getWorkspaceDetail(workspaceId);
  if (!data) notFound();

  const { workspace, owner, members } = data;
  const ownerRow = Array.isArray(owner) ? owner[0] : owner;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-xs">{workspace.slug}</span> · created {formatDateID(workspace.createdAt)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{ownerRow?.name ?? "—"}</p>
            <p className="text-muted-foreground">{ownerRow?.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Badge variant={(workspace as { plan?: string }).plan === "free" ? "secondary" : "success"}>
              {(workspace as { plan?: string }).plan ?? "free"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name ?? "—"}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "owner" ? "default" : m.role === "member" ? "info" : "secondary"}>
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateID(m.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
