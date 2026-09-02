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
        <div><div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="font-medium">Passkeys</p><p className="text-xs text-muted-foreground">{t("Gunakan sidik jari, wajah, atau kunci keamanan.", "Use fingerprint, face, or a security key.")}</p></div><Button type="button" size="sm" variant="outline" onClick={addPasskey} disabled={adding}>{adding ? t("Menambahkan…", "Adding…") : t("Tambah passkey", "Add passkey")}</Button></div>
          <div className="space-y-1.5">{passkeys.length ? passkeys.map((item) => <div key={item.id} className="flex items-center gap-2.5 rounded-lg border p-2.5"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs font-medium">{item.name || "Passkey"}</p><p className="text-[10px] text-muted-foreground">{item.deviceType} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : t("Tanggal tidak tersedia", "Date unavailable")}</p></div></div>) : <p className="text-xs text-muted-foreground">{t("Belum ada passkey.", "No passkeys yet.")}</p>}</div>
        </div>
        <div className="flex flex-col justify-between gap-2 border-t pt-3 sm:flex-row sm:items-center"><div><p className="font-medium text-xs">{t("Pemulihan akun", "Account recovery")}</p><p className="text-[11px] text-muted-foreground">{t("Pemulihan manual butuh 72 jam & dua admin.", "Manual recovery takes 72 hours & two admins.")}</p></div><Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link href="/mfa/recovery">{t("Buka", "Open")}</Link></Button></div>
        {!hasCredentialPassword && <p className="text-xs text-muted-foreground">{t("Akun memakai provider eksternal dan tidak memiliki password credential.", "This account uses an external provider and has no credential password.")}</p>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><CardTitle className="flex items-center gap-2"><Laptop className="h-5 w-5" />{t("Sesi & perangkat", "Sessions & devices")}</CardTitle><CardDescription>{t("Menampilkan 5 sesi terbaru.", "Showing 5 latest sessions.")}</CardDescription></div><Button type="button" variant="outline" onClick={revokeOthers} disabled={pending || sessions.length < 2}>{t("Keluarkan perangkat lain", "Sign out other devices")}</Button></CardHeader>
      <CardContent className="space-y-3">{sessions.map((item, index) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">{friendlyDeviceName(item.userAgent) || t("Perangkat tidak dikenal", "Unknown device")} {index === 0 && <Badge variant="secondary" className="ml-2">{t("Terbaru", "Latest")}</Badge>}</p><p className="text-xs text-muted-foreground">{item.ipAddress || t("IP tidak tersedia", "IP unavailable")} · {new Date(item.updatedAt).toLocaleString()}</p></div><Button type="button" variant="outline" size="sm" onClick={() => revoke(item.id)} disabled={pending}>{t("Keluar", "Sign out")}</Button></div>)}</CardContent>
    </Card>
  </>;
}
