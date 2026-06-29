import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, Receipt, Calendar, Sparkles, Mail } from "lucide-react";
import { TeamManager } from "@/components/settings/team-manager";
import { ReplyToEmailForm } from "@/components/settings/reply-to-email-form";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
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
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi workspace dan akses tim.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Workspace</CardTitle>
            <CardDescription>Info workspace utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span>{workspace.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><Badge variant="secondary">{workspace.slug}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mata Uang</span><span>{workspace.defaultCurrency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pajak</span><span>{workspace.defaultTaxRate}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Booking slug</span><span>{workspace.bookingSlug}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team</CardTitle>
            <CardDescription>{canManageTeam ? "Tambah user, ubah role, atau hapus anggota." : "Lihat anggota tim workspace."}</CardDescription>
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
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Reply-To</CardTitle>
          <CardDescription>Atur alamat Reply-To agar balasan klien masuk ke inbox pribadimu.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReplyToEmailForm workspaceId={workspace.id} currentValue={workspace.replyToEmail} />
          <p className="text-xs text-muted-foreground mt-2">Kosongkan untuk gunakan pengirim default. Balasan akan dikirim ke alamat ini jika diatur.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Modul</CardTitle>
          <CardDescription>Placeholder MVP. Form edit belum disambung.</CardDescription>
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
