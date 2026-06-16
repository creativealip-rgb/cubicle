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
      toast.success("Team member added");
      setEmail("");
      setRole("member");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: "member" | "viewer") {
    try {
      await updateWorkspaceMemberRole({ memberId, role: nextRole });
      toast.success("Role updated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member from workspace?")) return;
    try {
      await removeWorkspaceMember(memberId);
      toast.success("Member removed");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="rounded-lg border p-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="team-email">Add existing user by email</Label>
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
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "member" | "viewer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            <UserPlus className="h-4 w-4" /> {loading ? "Adding..." : "Add"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          MVP invite mode: user must signup first, then owner adds email here.
        </p>
      </form>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{member.name || "Unnamed user"}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {member.role === "owner" ? (
                <Badge>owner</Badge>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v as "member" | "viewer")}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">member</SelectItem>
                    <SelectItem value="viewer">viewer</SelectItem>
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
