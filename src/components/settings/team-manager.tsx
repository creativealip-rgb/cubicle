"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addWorkspaceMember, removeWorkspaceMember, updateWorkspaceMemberRole } from "@/lib/actions/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Member = {
  id: string;
  role: "owner" | "member" | "viewer";
  name: string | null;
  email: string | null;
};

export function TeamManager({
  members,
  canInvite = true,
  inviteBlockedReason,
}: {
  members: Member[];
  canInvite?: boolean;
  inviteBlockedReason?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canInvite) {
      toast.error(inviteBlockedReason || "Plan tidak mengizinkan undangan.");
      return;
    }
    setLoading(true);
    try {
      const result = await addWorkspaceMember({ email, role });
      if (result.status === "pending_signup") {
        toast.success(result.message, { duration: 6000 });
      } else {
        toast.success(result.message || "Anggota tim ditambahkan");
      }
      setEmail("");
      setRole("member");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah anggota");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: "member" | "viewer") {
    try {
      await updateWorkspaceMemberRole({ memberId, role: nextRole });
      toast.success("Peran diperbarui");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui peran");
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Hapus anggota tim ini dari workspace?")) return;
    try {
      await removeWorkspaceMember(memberId);
      toast.success("Anggota dihapus");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus anggota");
    }
  }

  return (
    <div className="space-y-4">
      {!canInvite && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Undangan tim terkunci</p>
          <p className="mt-1 text-xs text-amber-800/90">
            {inviteBlockedReason || "Upgrade ke plan Team untuk kolaborasi."}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2 h-8">
            <Link href="/app/billing">Upgrade plan</Link>
          </Button>
        </div>
      )}

      <form onSubmit={handleAdd} className="rounded-lg border p-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="team-email">Undang via email</Label>
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
            <Label>Peran</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "member" | "viewer")}
              disabled={!canInvite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Anggota</SelectItem>
                <SelectItem value="viewer">Pengamat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading || !canInvite} className="gap-2">
            <UserPlus className="h-4 w-4" /> {loading ? "Mengirim..." : "Undang"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Kalau email sudah punya akun Cubiqlo → langsung join workspace + email notif.
            Belum daftar → email undangan signup dikirim; setelah signup, undang lagi biar masuk.
          </span>
        </p>
      </form>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{member.name || "Tanpa nama"}</p>
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
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Anggota</SelectItem>
                    <SelectItem value="viewer">Pengamat</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {member.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemove(member.id)}
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
