"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { updateAccountName, updateAccountPassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";

type AccountSettingsFormProps = {
  name: string;
  email: string;
  emailVerified: boolean;
};

export function AccountSettingsForm({ name, email, emailVerified }: AccountSettingsFormProps) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [displayName, setDisplayName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pendingName, startNameTransition] = useTransition();
  const [pendingPassword, startPasswordTransition] = useTransition();

  function saveName() {
    startNameTransition(async () => {
      const res = await updateAccountName(displayName);
      if (!res.ok) {
        toast.error(res.error ?? t("Gagal menyimpan nama", "Failed to save name"));
        return;
      }
      toast.success(t("Nama akun diperbarui", "Account name updated"));
      refresh();
    });
  }

  function savePassword() {
    startPasswordTransition(async () => {
      if (newPassword !== confirmPassword) {
        toast.error(t("Konfirmasi password tidak cocok", "Password confirmation does not match"));
        return;
      }
      const res = await updateAccountPassword(currentPassword, newPassword);
      if (!res.ok) {
        toast.error(res.error ?? t("Gagal mengganti password", "Failed to change password"));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("Password diperbarui. Sesi perangkat lain sudah dikeluarkan.", "Password updated. Other device sessions were signed out."));
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:max-w-md">
          <Label htmlFor="account-name">{t("Nama / username", "Name / username")}</Label>
          <Input
            id="account-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("Nama tampil", "Display name")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-email">{t("Email login", "Login email")}</Label>
          <Input id="account-email" value={email} disabled />
          <p className="text-xs text-muted-foreground">
            {emailVerified ? t("Email sudah terverifikasi.", "Email is verified.") : t("Email belum terverifikasi.", "Email is not verified.")} {t("Edit email belum dibuka demi keamanan login.", "Email editing is unavailable to protect login security.")}
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={saveName}
        disabled={pendingName}
        className="w-full sm:w-auto"
      >
        {pendingName ? t("Menyimpan…", "Saving…") : t("Simpan nama", "Save name")}
      </Button>

      <div className="border-t pt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Ganti password pakai password sekarang. Minimal 8 karakter.", "Use your current password. New password must be at least 8 characters.")}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setShowPasswords((v) => !v)}>
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPasswords ? t("Sembunyikan", "Hide") : t("Tampilkan", "Show")}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t("Password sekarang", "Current password")}</Label>
            <Input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("Password baru", "New password")}</Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("Konfirmasi password", "Confirm password")}</Label>
            <Input id="confirm-password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </div>
        </div>
        <Button
          type="button"
          className="mt-4 w-full sm:w-auto"
          onClick={savePassword}
          disabled={pendingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
        >
          {pendingPassword ? t("Mengganti…", "Updating…") : t("Ganti password", "Change password")}
        </Button>
      </div>
    </div>
  );
}
