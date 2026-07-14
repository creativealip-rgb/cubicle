"use client";

import { useState } from "react";
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
import { Trash2, UserPlus } from "lucide-react";

type Member = {
  id: string;
  role: "owner" | "member" | "viewer";
  name: string | null;
  email: string | null;
};

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await addWorkspaceMember({ email, role });
      toast.success("Anggota tim ditambahkan");
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
      <form onSubmit={handleAdd} className="rounded-lg border p-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="team-email">Tambah user via email</Label>
            <Input
              id="team-email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "member" | "viewer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Anggota</SelectItem>
                <SelectItem value="viewer">Pengamat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            <UserPlus className="h-4 w-4" /> {loading ? "Menambah..." : "Tambah"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          User harus daftar akun dulu, baru pemilik workspace bisa menambahkan emailnya di sini.
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(member.id)}>
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
