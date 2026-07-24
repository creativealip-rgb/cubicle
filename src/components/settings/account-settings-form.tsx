"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { updateAccountName, updateAccountPassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountSettingsFormProps = {
  name: string;
  email: string;
  emailVerified: boolean;
};

export function AccountSettingsForm({ name, email, emailVerified }: AccountSettingsFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pendingName, startNameTransition] = useTransition();
  const [pendingPassword, startPasswordTransition] = useTransition();

  function saveName() {
    startNameTransition(async () => {
      const res = await updateAccountName(displayName);
      if (!res.ok) {
        toast.error(res.error ?? "Gagal menyimpan nama");
        return;
      }
      toast.success("Nama akun diperbarui");
      router.refresh();
    });
  }

  function savePassword() {
    startPasswordTransition(async () => {
      const res = await updateAccountPassword(currentPassword, newPassword);
      if (!res.ok) {
        toast.error(res.error ?? "Gagal mengganti password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password diperbarui");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-name">Nama / username</Label>
          <Input
            id="account-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nama tampil"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-email">Email login</Label>
          <Input id="account-email" value={email} disabled />
          <p className="text-xs text-muted-foreground">
            {emailVerified ? "Email sudah terverifikasi." : "Email belum terverifikasi."} Edit email belum dibuka demi keamanan login.
          </p>
        </div>
      </div>
      <Button type="button" onClick={saveName} disabled={pendingName}>
        {pendingName ? "Menyimpan…" : "Simpan nama"}
      </Button>

      <div className="border-t pt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ganti password pakai password sekarang. Minimal 8 karakter.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPasswords((v) => !v)}>
            {showPasswords ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showPasswords ? "Sembunyikan" : "Tampilkan"}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="current-password">Password sekarang</Label>
            <Input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password baru</Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button type="button" className="mt-4" onClick={savePassword} disabled={pendingPassword}>
          {pendingPassword ? "Mengganti…" : "Ganti password"}
        </Button>
      </div>
    </div>
  );
}
