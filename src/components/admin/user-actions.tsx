"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  banUser,
  changeUserPlan,
  resetUserPassword,
  unbanUser,
  updateUser,
} from "@/lib/actions/admin/users";
import type { AdminListUserRow } from "@/lib/admin-schemas";

type DialogState =
  | { kind: "edit"; user: AdminListUserRow }
  | { kind: "plan"; user: AdminListUserRow }
  | { kind: "ban"; user: AdminListUserRow }
  | { kind: "unban"; user: AdminListUserRow }
  | { kind: "reset"; user: AdminListUserRow };

export function UserActions({ user }: { user: AdminListUserRow }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { refresh } = useAppTransition();

  const close = () => setDialog(null);

  async function run(fn: () => Promise<unknown>) {
    try {
      const res = await fn();
      const r = res as { ok?: boolean; error?: string };
      if (r?.ok === false) {
        toast.error(r.error ?? "Action failed");
        return;
      }
      toast.success("Done");
      refresh();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "edit", user })}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "plan", user })}>
          Plan
        </Button>
        {user.banned ? (
          <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "unban", user })}>
            Unban
          </Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => setDialog({ kind: "ban", user })}>
            Ban
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: "reset", user })}>
          Reset PW
        </Button>
      </div>

      {dialog?.kind === "edit" && <EditUserDialog user={dialog.user} onClose={close} run={run} />}
      {dialog?.kind === "plan" && <PlanDialog user={dialog.user} onClose={close} run={run} />}
      {dialog?.kind === "ban" && <BanDialog user={dialog.user} onClose={close} run={run} />}
      {dialog?.kind === "unban" && (
        <ConfirmDialog
          title="Unban user"
          description={`Reinstate ${dialog.user.email}? Sessions will work again.`}
          confirmLabel="Unban"
          onConfirm={() => run(() => unbanUser({ userId: dialog.user.id }))}
          onClose={close}
        />
      )}
      {dialog?.kind === "reset" && <ResetDialog user={dialog.user} onClose={close} run={run} />}
    </>
  );
}

/* ── Dialogs ── */

function EditUserDialog({
  user,
  onClose,
  run,
}: {
  user: AdminListUserRow;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: user.name ?? "", email: user.email, emailVerified: user.emailVerified });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await run(() => updateUser({ userId: user.id, ...form }));
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.emailVerified}
              onChange={(e) => setForm({ ...form, emailVerified: e.target.checked })}
              className="h-4 w-4"
            />
            Email verified
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" loading={loading}>Save</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({
  user,
  onClose,
  run,
}: {
  user: AdminListUserRow;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    plan: (user.plan as "free" | "solo" | "team") || "free",
    expiresAt: user.planExpiresAt ? user.planExpiresAt.toISOString().slice(0, 10) : "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await run(() =>
      changeUserPlan({
        userId: user.id,
        plan: form.plan,
        planExpiresAt: form.expiresAt ? `${form.expiresAt}T00:00:00.000Z` : null,
        reason: form.reason || "Manual change",
      }),
    );
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change plan — {user.email}</DialogTitle>
          <DialogDescription>
            Sets users.plan + planExpiresAt directly (no payment row). Empty expiry = permanent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as "free" | "solo" | "team" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expires (YYYY-MM-DD, blank = permanent)</Label>
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (audited)</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} placeholder="Why this change?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" loading={loading}>Save plan</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BanDialog({
  user,
  onClose,
  run,
}: {
  user: AdminListUserRow;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await run(() => banUser({ userId: user.id, reason }));
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user.email}</DialogTitle>
          <DialogDescription>
            Revokes all active sessions immediately and blocks new logins.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Optional reason (audited)" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" variant="destructive" loading={loading}>Ban user</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({
  user,
  onClose,
  run,
}: {
  user: AdminListUserRow;
  onClose: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await run(() => resetUserPassword({ userId: user.id, newPassword: password }));
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" loading={loading}>Reset</LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <LoadingButton
            variant="destructive"
            loading={loading}
            onClick={() => {
              setLoading(true);
              void onConfirm();
            }}
          >
            {confirmLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
