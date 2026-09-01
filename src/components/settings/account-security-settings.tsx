"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { KeyRound, Laptop, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { revokeAccountSession, signOutOtherSessions } from "@/lib/actions/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

type PasskeyItem = { id: string; name: string | null; deviceType: string; createdAt: Date | null };
type SessionItem = { id: string; updatedAt: Date; ipAddress: string | null; userAgent: string | null };

export function AccountSecuritySettings({ twoFactorEnabled, hasAuthenticator, hasCredentialPassword, passkeys, sessions }: { twoFactorEnabled: boolean; hasAuthenticator: boolean; hasCredentialPassword: boolean; passkeys: PasskeyItem[]; sessions: SessionItem[] }) {
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  async function addPasskey() {
    setAdding(true);
    const result = await authClient.passkey.addPasskey({ name: "Cubiqlo passkey", createSession: false });
    setAdding(false);
    if (result.error) return toast.error(result.error.message ?? t("Passkey gagal ditambahkan", "Could not add passkey"));
    toast.success(t("Passkey ditambahkan", "Passkey added"));
    window.location.reload();
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
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">Two-step verification</p><p className="text-sm text-muted-foreground">{hasAuthenticator ? t("Authenticator aktif", "Authenticator active") : passkeys.length ? t("Passkey aktif", "Passkey active") : t("Setup belum lengkap", "Setup incomplete")}</p></div><Badge variant={twoFactorEnabled ? "default" : "destructive"}>{twoFactorEnabled ? t("Aktif", "Active") : t("Tidak aktif", "Inactive")}</Badge></div>
        <div><div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-medium">Passkeys</p><p className="text-sm text-muted-foreground">{t("Gunakan sidik jari, wajah, atau kunci keamanan.", "Use fingerprint, face, or a security key.")}</p></div><Button type="button" variant="outline" onClick={addPasskey} disabled={adding}>{adding ? t("Menambahkan…", "Adding…") : t("Tambah passkey", "Add passkey")}</Button></div>
          <div className="space-y-2">{passkeys.length ? passkeys.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{item.name || "Passkey"}</p><p className="text-xs text-muted-foreground">{item.deviceType} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : t("Tanggal tidak tersedia", "Date unavailable")}</p></div></div>) : <p className="text-sm text-muted-foreground">{t("Belum ada passkey.", "No passkeys yet.")}</p>}</div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center"><div><p className="font-medium">{t("Pemulihan akun", "Account recovery")}</p><p className="text-sm text-muted-foreground">{t("Jika semua faktor dan recovery code hilang, proses manual butuh 72 jam dan dua admin.", "If all factors and recovery codes are lost, manual recovery takes 72 hours and two admins.")}</p></div><Button asChild variant="outline"><Link href="/mfa/recovery">{t("Buka pemulihan", "Open recovery")}</Link></Button></div>
        {!hasCredentialPassword && <p className="text-xs text-muted-foreground">{t("Akun memakai provider eksternal dan tidak memiliki password credential.", "This account uses an external provider and has no credential password.")}</p>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Laptop className="h-5 w-5" />{t("Sesi & perangkat", "Sessions & devices")}</CardTitle><CardDescription>{t("Tinjau perangkat aktif dan keluarkan akses yang tidak dikenal.", "Review active devices and remove unrecognized access.")}</CardDescription></CardHeader>
      <CardContent className="space-y-3">{sessions.map((item, index) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">{item.userAgent?.split(" ").slice(0, 3).join(" ") || t("Perangkat tidak dikenal", "Unknown device")} {index === 0 && <Badge variant="secondary" className="ml-2">{t("Terbaru", "Latest")}</Badge>}</p><p className="text-xs text-muted-foreground">{item.ipAddress || t("IP tidak tersedia", "IP unavailable")} · {new Date(item.updatedAt).toLocaleString()}</p></div><Button type="button" variant="outline" size="sm" onClick={() => revoke(item.id)} disabled={pending}>{t("Keluar", "Sign out")}</Button></div>)}<Button type="button" variant="outline" onClick={revokeOthers} disabled={pending || sessions.length < 2}>{t("Keluarkan perangkat lain", "Sign out other devices")}</Button></CardContent>
    </Card>
  </>;
}
