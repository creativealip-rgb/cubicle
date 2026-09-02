"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react";
import { updateAccountName, updateAccountPassword, requestAccountEmailChange } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // Change Email Modal state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [pendingEmail, startEmailTransition] = useTransition();
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

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

  function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    startEmailTransition(async () => {
      const res = await requestAccountEmailChange(newEmail, emailPassword);
      if (!res.ok) {
        toast.error(res.error ?? t("Gagal mengirim email konfirmasi", "Failed to send confirmation email"));
        return;
      }
      setEmailSentSuccess(true);
      toast.success(t("Email konfirmasi dikirim", "Confirmation email sent"));
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
      <div className="grid gap-3 sm:grid-cols-1">
        <div className="space-y-1.5">
          <Label htmlFor="account-name">{t("Nama / username", "Name / username")}</Label>
          <Input
            id="account-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("Nama tampil", "Display name")}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="account-email">{t("Email login", "Login email")}</Label>
            <Dialog open={emailDialogOpen} onOpenChange={(open) => {
              setEmailDialogOpen(open);
              if (!open) {
                setEmailSentSuccess(false);
                setNewEmail("");
                setEmailPassword("");
              }
            }}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("Ganti email", "Change email")}
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4 text-primary" />
                    {t("Ganti Email Login", "Change Login Email")}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {t(
                      "Masukkan alamat email baru dan password akunmu. Link konfirmasi akan dikirim ke email baru.",
                      "Enter your new email address and account password. A confirmation link will be sent to the new email.",
                    )}
                  </DialogDescription>
                </DialogHeader>

                {emailSentSuccess ? (
                  <div className="py-4 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold">{t("Link Konfirmasi Terkirim!", "Confirmation Link Sent!")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        `Kami telah mengirim link verifikasi ke ${newEmail}. Buka email tersebut untuk menyelesaikan pergantian.`,
                        `We sent a verification link to ${newEmail}. Open that email to complete the change.`,
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-xl w-full"
                      onClick={() => setEmailDialogOpen(false)}
                    >
                      {t("Tutup", "Close")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleEmailChange} className="space-y-3.5 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-email-val" className="text-xs">{t("Email saat ini", "Current email")}</Label>
                      <Input id="current-email-val" value={email} disabled className="h-9 text-xs bg-muted/40" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-email-val" className="text-xs">{t("Email baru", "New email")}</Label>
                      <Input
                        id="new-email-val"
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new-email@example.com"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-password-val" className="text-xs">{t("Password akun", "Account password")}</Label>
                      <Input
                        id="email-password-val"
                        type="password"
                        required
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-9 text-xs"
                      />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmailDialogOpen(false)}
                        className="text-xs h-8"
                      >
                        {t("Batal", "Cancel")}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={pendingEmail || !newEmail || !emailPassword}
                        className="text-xs h-8"
                      >
                        {pendingEmail ? t("Mengirim…", "Sending…") : t("Kirim Konfirmasi", "Send Confirmation")}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <Input id="account-email" value={email} disabled />
          <p className="text-[11px] text-muted-foreground">
            {emailVerified ? t("Email terverifikasi.", "Email verified.") : t("Email belum terverifikasi.", "Email unverified.")}
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
        <div className="grid gap-3 sm:grid-cols-1">
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
