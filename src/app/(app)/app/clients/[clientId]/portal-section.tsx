"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generatePortalToken, revealClientPortalPassword, revokePortalToken, setClientPortalPassword } from "@/lib/actions/clients";
import { resolveClientPortalActive, resolveClientPortalPasswordState } from "@/lib/client-portal-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, X, ExternalLink, KeyRound, Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n-client";

interface Props {
  existingPortalToken: string | null;
  client: { id:string; portalEnabled:boolean; portalSlug:string|null; portalSlugEnabled:boolean; portalTokenHash:string|null; portalTokenExpiresAt:Date|string|null; portalTokenRevokedAt:Date|string|null; portalPasswordHash:string|null; portalPasswordCiphertext:string|null };
}

export function PortalTokenSection({ client }: Props) {
  const { t } = useT();
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [password,setPassword]=useState("");
  const [origin,setOrigin]=useState("");
  const [revealedPassword,setRevealedPassword]=useState<string|null>(null);
  useEffect(()=>setOrigin(window.location.origin),[]);
  const fallbackSlug=`client-${client.id.slice(0,8)}`;
  const slug=client.portalSlug || fallbackSlug;
  const portalUrl=`${origin}/client-portal/${slug}`;
  const active=resolveClientPortalActive(client);
  const passwordState=resolveClientPortalPasswordState(client);

  async function savePassword(){
    setLoading(true);
    try {
      await generatePortalToken(client.id);
      await setClientPortalPassword(client.id,password);
      setPassword(""); toast.success(t("Portal aktif dan password tersimpan", "Portal active and password saved")); window.location.reload();
    }catch(e){toast.error(e instanceof Error?e.message:t("Gagal menyimpan password", "Failed to save password"));}finally{setLoading(false);}
  }
  async function copy(){await navigator.clipboard.writeText(portalUrl);setCopied(true);toast.success(t("Link portal disalin", "Portal link copied"));setTimeout(()=>setCopied(false),2000);}
  async function revoke(){setLoading(true);try{await revokePortalToken(client.id);toast.success(t("Akses portal dicabut", "Portal access revoked"));window.location.reload();}finally{setLoading(false);}}
  async function reveal(){setLoading(true);try{const result=await revealClientPortalPassword(client.id);if(result.state==="revealed")setRevealedPassword(result.password);else toast.error(t("Password lama tidak dapat ditampilkan", "Legacy password cannot be displayed"));}catch(e){toast.error(e instanceof Error?e.message:t("Gagal menampilkan password", "Failed to show password"));}finally{setLoading(false);}}
  async function copyPassword(){if(!revealedPassword)return;await navigator.clipboard.writeText(revealedPassword);toast.success(t("Password disalin", "Password copied"));}

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4"/> {t("Portal Klien", "Client Portal")}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2"><Badge variant={active?"default":"secondary"}>{active?t("Aktif","Active"):t("Nonaktif","Inactive")}</Badge><span className="text-xs text-muted-foreground">{t("Link selalu tersedia. Konten hanya terbuka setelah password benar.", "Link is always available. Content only opens after correct password.")}</span></div>
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium">{t("Link portal", "Portal link")}</p>
        <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-2 text-xs">{portalUrl}</code>
          <Button variant="outline" size="icon" onClick={copy} aria-label={t("Salin link portal", "Copy portal link")} title={t("Salin link portal", "Copy portal link")}>{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</Button>
          <Button variant="outline" size="icon" asChild><a href={portalUrl} target="_blank" rel="noreferrer" aria-label={t("Buka portal klien", "Open client portal")} title={t("Buka portal klien", "Open client portal")}><ExternalLink className="h-4 w-4"/></a></Button>
        </div>
      </div>
      {passwordState==="legacy"&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("Password lama tidak dapat ditampilkan. Ganti password untuk mengaktifkan fitur tampilkan dan salin.", "Legacy password cannot be displayed. Change password to enable show and copy features.")}</p>}
      {passwordState==="revealable"&&<div className="space-y-2 rounded-lg border p-3"><p className="text-xs font-medium">{t("Password portal", "Portal password")}</p><div className="flex flex-wrap items-center gap-2"><code className="min-w-32 rounded bg-muted px-3 py-2 text-sm">{revealedPassword??"••••••••"}</code>{revealedPassword?<><Button type="button" variant="outline" size="sm" onClick={()=>setRevealedPassword(null)} aria-label={t("Sembunyikan password", "Hide password")}><EyeOff className="h-4 w-4"/>{t("Sembunyikan password", "Hide password")}</Button><Button type="button" variant="outline" size="sm" onClick={copyPassword} aria-label={t("Salin password", "Copy password")}><Copy className="h-4 w-4"/>{t("Salin password", "Copy password")}</Button></>:<Button type="button" variant="outline" size="sm" onClick={reveal} disabled={loading} aria-label={t("Tampilkan password", "Show password")}><Eye className="h-4 w-4"/>{t("Tampilkan password", "Show password")}</Button>}</div></div>}
      <div className="space-y-2"><label htmlFor="portal-password" className="text-sm font-medium">{client.portalPasswordHash?t("Ganti password","Change password"):t("Atur password","Set password")}</label>
        <div className="flex flex-col gap-2 sm:flex-row"><Input id="portal-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} placeholder={t("Minimal 8 karakter", "Minimum 8 characters")} autoComplete="new-password"/>
          <Button onClick={savePassword} disabled={loading||password.length<8} className="gap-1.5 rounded-xl"><KeyRound className="h-4 w-4"/>{loading?t("Menyimpan...", "Saving..."):active?t("Perbarui password","Update password"):t("Simpan & aktifkan","Save & activate")}</Button></div>
      </div>
      {client.portalEnabled && <Button variant="outline" size="sm" className="gap-1 text-red-600" onClick={revoke} disabled={loading}><X className="h-3 w-3"/>{t("Cabut akses", "Revoke access")}</Button>}
    </CardContent>
  </Card>;
}
