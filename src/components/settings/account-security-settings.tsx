"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { KeyRound, Laptop, ShieldCheck, Download, Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { revokeAccountSession, signOutOtherSessions } from "@/lib/actions/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type PasskeyItem = { id: string; name: string | null; deviceType: string; createdAt: Date | null };
type SessionItem = { id: string; updatedAt: Date; ipAddress: string | null; userAgent: string | null };

function friendlyDeviceName(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = userAgent.includes("Edg/") ? "Edge" : userAgent.includes("Chrome/") ? "Chrome" : userAgent.includes("Firefox/") ? "Firefox" : userAgent.includes("Safari/") ? "Safari" : userAgent.startsWith("curl/") ? "Command line" : "Browser";
  const device = /Android|iPhone|iPad|Mobile/i.test(userAgent) ? "Mobile" : /Windows/i.test(userAgent) ? "Windows" : /Macintosh|Mac OS/i.test(userAgent) ? "Mac" : /Linux/i.test(userAgent) ? "Linux" : "Device";
  return `${browser} · ${device}`;
}

export function AccountSecuritySettings({ twoFactorEnabled, hasAuthenticator, hasCredentialPassword, passkeys, sessions }: { twoFactorEnabled: boolean; hasAuthenticator: boolean; hasCredentialPassword: boolean; passkeys: PasskeyItem[]; sessions: SessionItem[] }) {
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  // Backup codes modal state
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function addPasskey() {
    setAdding(true);
    const result = await authClient.passkey.addPasskey({ name: "Cubiqlo passkey", createSession: false });
    setAdding(false);
    if (result.error) return toast.error(result.error.message ?? t("Passkey gagal ditambahkan", "Could not add passkey"));
    toast.success(t("Passkey ditambahkan", "Passkey added"));
    window.location.reload();
  }

  async function handleGenerateBackupCodes(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password: backupPassword,
      });
      if (result.error) {
        toast.error(result.error.message ?? t("Gagal generate backup codes", "Failed to generate backup codes"));
      } else if (result.data?.backupCodes) {
        setBackupCodes(result.data.backupCodes);
        toast.success(t("10 Backup codes baru berhasil dibuat", "10 new backup codes generated"));
      }
    } catch {
      toast.error(t("Terjadi kesalahan saat membuat backup codes", "An error occurred generating backup codes"));
    } finally {
      setGenerating(false);
    }
  }

  function copyAllBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    toast.success(t("Backup codes disalin ke clipboard", "Backup codes copied to clipboard"));
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadBackupCodes() {
    const url = URL.createObjectURL(new Blob([backupCodes.join("\n")], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cubiqlo-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("File backup codes didownload", "Backup codes file downloaded"));
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await revokeAccountSession(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("Sesi dikeluarkan", "Session signed out"));
      window.location.reload();
    });
  }

  function revokeOthers() {
    startTransition(async () => {
      const result = await signOutOtherSessions();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("Perangkat lain sudah dikeluarkan", "Other devices signed out"));
      window.location.reload();
    });
  }

  return <>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{t("Keamanan", "Security")}</CardTitle><CardDescription>{t("Kelola verifikasi dua langkah dan metode pemulihan.", "Manage two-step verification and recovery methods.")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {/* 2FA Master Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium text-xs">Two-step verification (2FA)</p>
            <p className="text-[11px] text-muted-foreground">
              {twoFactorEnabled
                ? (hasAuthenticator ? t("Authenticator aktif", "Authenticator active") : t("2FA Aktif", "2FA Active"))
                : t("Proteksi login dengan Authenticator App atau Passkey.", "Protect login with Authenticator App or Passkey.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={twoFactorEnabled ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
              {twoFactorEnabled ? t("Aktif", "Active") : t("Tidak aktif", "Inactive")}
            </Badge>
            <Button asChild size="sm" variant={twoFactorEnabled ? "outline" : "default"} className="h-7 text-xs">
              <Link href="/mfa/setup?force=1">
                {twoFactorEnabled ? t("Kelola", "Manage") : t("Setup 2FA", "Setup 2FA")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Recovery Backup Codes Card Section */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <div className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <p className="font-medium text-xs">{t("Recovery Backup Codes", "Recovery Backup Codes")}</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("10 kode cadangan sekali pakai jika kehilangan HP/Authenticator.", "10 single-use codes if you lose phone/authenticator.")}
            </p>
          </div>
          <Dialog open={backupDialogOpen} onOpenChange={(open) => {
            setBackupDialogOpen(open);
            if (!open) {
              setBackupCodes([]);
              setBackupPassword("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                {t("Generate Kode", "Generate Codes")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 text-primary" />
                  {t("Recovery Backup Codes", "Recovery Backup Codes")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t(
                    "Buat 10 kode cadangan baru. Kode lama akan otomatis tidak berlaku.",
                    "Generate 10 new recovery codes. Previous codes will be invalidated.",
                  )}
                </DialogDescription>
              </DialogHeader>

              {backupCodes.length > 0 ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("Simpan kode ini di tempat yang aman. Setiap kode hanya berlaku 1 kali.", "Save these codes safely. Each code can be used once.")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 font-mono text-xs text-amber-950">
                    {backupCodes.map((code) => (
                      <span key={code} className="py-0.5 px-1 bg-white/60 rounded text-center">{code}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyAllBackupCodes}
                      className="text-xs h-8"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {copied ? t("Tersalin", "Copied") : t("Salin Semua", "Copy All")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadBackupCodes}
                      className="text-xs h-8"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      {t("Download .txt", "Download .txt")}
                    </Button>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => setBackupDialogOpen(false)}
                    >
                      {t("Selesai & Tutup", "Done & Close")}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={handleGenerateBackupCodes} className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="backup-pw" className="text-xs">{t("Konfirmasi password akun", "Confirm account password")}</Label>
                    <Input
                      id="backup-pw"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBackupDialogOpen(false)}
                      className="text-xs h-8"
                    >
                      {t("Batal", "Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={generating || !backupPassword}
                      className="text-xs h-8"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                          {t("Membuat…", "Generating…")}
                        </>
                      ) : (
                        t("Buat 10 Kode Baru", "Generate 10 New Codes")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Passkeys List */}
        <div>
          <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium text-xs">Passkeys</p>
              <p className="text-[11px] text-muted-foreground">{t("Gunakan sidik jari, wajah, atau PIN perangkat.", "Use fingerprint, face, or device PIN.")}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addPasskey} disabled={adding} className="h-7 text-xs">
              {adding ? t("Menambahkan…", "Adding…") : t("Tambah passkey", "Add passkey")}
            </Button>
          </div>
          <div className="space-y-1.5">{passkeys.length ? passkeys.map((item) => <div key={item.id} className="flex items-center gap-2.5 rounded-lg border p-2.5"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs font-medium">{item.name || "Passkey"}</p><p className="text-[10px] text-muted-foreground">{item.deviceType} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : t("Tanggal tidak tersedia", "Date unavailable")}</p></div></div>) : <p className="text-xs text-muted-foreground">{t("Belum ada passkey terdaftar.", "No passkeys registered yet.")}</p>}</div>
        </div>

        {/* Manual Account Recovery Link */}
        <div className="flex flex-col justify-between gap-2 border-t pt-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-medium text-xs">{t("Pemulihan akun manual", "Manual account recovery")}</p>
            <p className="text-[11px] text-muted-foreground">{t("Pemulihan butuh 72 jam & approval 2 admin.", "Recovery requires 72 hours & 2 admin approvals.")}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link href="/mfa/recovery">{t("Buka", "Open")}</Link>
          </Button>
        </div>

        {!hasCredentialPassword && <p className="text-xs text-muted-foreground">{t("Akun memakai provider eksternal dan tidak memiliki password credential.", "This account uses an external provider and has no credential password.")}</p>}
      </CardContent>
    </Card>

    {/* Sessions & Devices Card */}
    <Card>
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><CardTitle className="flex items-center gap-2"><Laptop className="h-5 w-5" />{t("Sesi & perangkat", "Sessions & devices")}</CardTitle><CardDescription className="text-xs">{t("Menampilkan 5 sesi terbaru.", "Showing 5 latest sessions.")}</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={revokeOthers} disabled={pending || sessions.length < 2} className="h-7 text-xs shrink-0">{t("Keluarkan sesi lain", "Sign out other devices")}</Button></CardHeader>
      <CardContent className="space-y-2.5">{sessions.map((item, index) => <div key={item.id} className="flex flex-col justify-between gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center"><div><p className="text-xs font-medium">{friendlyDeviceName(item.userAgent) || t("Perangkat tidak dikenal", "Unknown device")} {index === 0 && <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0">{t("Terbaru", "Latest")}</Badge>}</p><p className="text-[10px] text-muted-foreground">{item.ipAddress || t("IP tidak tersedia", "IP unavailable")} · {new Date(item.updatedAt).toLocaleString()}</p></div><Button type="button" variant="outline" size="sm" onClick={() => revoke(item.id)} disabled={pending} className="h-6 text-[10px] px-2 self-end sm:self-auto">{t("Keluar", "Sign out")}</Button></div>)}</CardContent>
    </Card>
  </>;
}
