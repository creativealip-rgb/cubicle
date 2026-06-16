import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, Receipt, Calendar, Sparkles } from "lucide-react";
import { TeamManager } from "@/components/settings/team-manager";

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const currentMember = await assertWorkspaceMember(db, user.id, workspaceId);
  const canManageTeam = currentMember.role === "owner";

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

  const members = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .leftJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId)))
    .orderBy(workspaceMembers.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Workspace configuration and team access.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Workspace</CardTitle>
            <CardDescription>Core workspace info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{workspace.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><Badge variant="secondary">{workspace.slug}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{workspace.defaultCurrency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{workspace.defaultTaxRate}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Booking slug</span><span>{workspace.bookingSlug}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team</CardTitle>
            <CardDescription>{canManageTeam ? "Add existing users, change roles, or remove members." : "View workspace team members."}</CardDescription>
          </CardHeader>
          <CardContent>
            {canManageTeam ? (
              <TeamManager members={members} />
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{member.name || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="secondary">{member.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module settings</CardTitle>
          <CardDescription>MVP placeholders. Edit forms belum disambung.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Button variant="outline" className="justify-start gap-2"><Receipt className="h-4 w-4" /> Billing</Button>
          <Button variant="outline" className="justify-start gap-2"><Calendar className="h-4 w-4" /> Booking</Button>
          <Button variant="outline" className="justify-start gap-2"><Sparkles className="h-4 w-4" /> AI usage</Button>
          <Button variant="outline" className="justify-start gap-2"><Users className="h-4 w-4" /> Roles</Button>
        </CardContent>
      </Card>
    </div>
  );
}
