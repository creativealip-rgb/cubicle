"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { addWorkspaceMember, removeWorkspaceMember, updateWorkspaceMemberRole } from "@/lib/actions/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, UserPlus, Mail } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type Member = {
  id: string;
  role: "owner" | "member" | "viewer";
  name: string | null;
  email: string | null;
};

export function TeamManager({
  members,
  canInvite = true,
}: {
  members: Member[];
  canInvite?: boolean;
  inviteBlockedReason?: string;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canInvite) {
      toast.error(t("Free plan tidak bisa mengundang anggota. Upgrade ke Team untuk kolaborasi.", "Free plan can't invite members. Upgrade to Team for collaboration."));
      return;
    }
    setLoading(true);
    try {
      const result = await addWorkspaceMember({ email, role });
      if (result.status === "pending_signup") {
        toast.success(result.message, { duration: 6000 });
      } else {
        toast.success(result.message || t("Anggota tim ditambahkan", "Team member added"));
      }
      setEmail("");
      setRole("member");
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menambah anggota", "Failed to add member"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: "member" | "viewer") {
    try {
      await updateWorkspaceMemberRole({ memberId, role: nextRole });
      toast.success(t("Peran diperbarui", "Role updated"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memperbarui peran", "Failed to update role"));
    }
  }

  async function handleRemove(member: Member) {
    const target = member.email || member.name || "anggota ini";
    if (!confirm(t(`Hapus ${target} dari workspace?`, `Remove ${target} from workspace?`))) return;
    try {
      await removeWorkspaceMember(member.id);
      toast.success(t("Anggota dihapus", "Member removed"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus anggota", "Failed to remove member"));
    }
  }

  return (
    <div className="space-y-4">
      {!canInvite && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">{t("Undangan tim terkunci", "Team invitations locked")}</p>
          <p className="mt-1 text-xs text-amber-800/90">
            {t("Free plan tidak bisa mengundang anggota. Upgrade ke Team untuk kolaborasi.", "Free plan can't invite members. Upgrade to Team for collaboration.")}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2 h-8">
            <Link href="/app/billing">{t("Upgrade plan", "Upgrade plan")}</Link>
          </Button>
        </div>
      )}

      <form onSubmit={handleAdd} className="rounded-lg border p-3 space-y-3">
        <div className="grid gap-3 md:max-w-2xl md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="team-email">{t("Undang via email", "Invite by email")}</Label>
            <Input
              id="team-email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!canInvite}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Peran", "Role")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "member" | "viewer")}
              disabled={!canInvite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("Anggota", "Member")}</SelectItem>
                <SelectItem value="viewer">{t("Pengamat", "Viewer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LoadingButton type="submit" loading={loading} loadingText={t("Mengirim...", "Sending...")} disabled={!canInvite} className="h-10 gap-2">
            <UserPlus className="h-4 w-4" /> {t("Undang", "Invite")}
          </LoadingButton>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {t("Kalau email sudah punya akun Cubiqlo → langsung join workspace + email notif. Belum daftar → email undangan signup dikirim; setelah signup, undang lagi biar masuk.", "If email already has a Cubiqlo account → they join workspace directly and get an email notification. Not registered yet → signup invitation email is sent; invite again after signup to add them.")}
          </span>
        </p>
      </form>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{member.name || t("Tanpa nama", "Unnamed")}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {member.role === "owner" ? (
                <Badge>Pemilik</Badge>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v as "member" | "viewer")}
                >
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t("Anggota", "Member")}</SelectItem>
                    <SelectItem value="viewer">{t("Pengamat", "Viewer")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {member.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  aria-label={t(`Hapus ${member.email || member.name || "anggota"}`, `Remove ${member.email || member.name || "member"}`)}
                  onClick={() => handleRemove(member)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
