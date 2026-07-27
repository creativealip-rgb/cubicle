"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generatePortalToken, revokePortalToken, setClientPortalPassword } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, X, ExternalLink, KeyRound } from "lucide-react";

interface Props {
  existingPortalToken: string | null;
  client: { id:string; portalEnabled:boolean; portalSlug:string|null; portalSlugEnabled:boolean; portalTokenHash:string|null; portalTokenExpiresAt:Date|string|null; portalTokenRevokedAt:Date|string|null; portalPasswordHash:string|null };
}

export function PortalTokenSection({ client }: Props) {
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [password,setPassword]=useState("");
  const [origin,setOrigin]=useState("");
  useEffect(()=>setOrigin(window.location.origin),[]);
  const fallbackSlug=`client-${client.id.slice(0,8)}`;
  const slug=client.portalSlug || fallbackSlug;
  const portalUrl=`${origin}/client-portal/${slug}`;
  const active=client.portalEnabled && !!client.portalPasswordHash && !client.portalTokenRevokedAt;

  async function savePassword(){
    setLoading(true);
    try {
      await generatePortalToken(client.id);
      await setClientPortalPassword(client.id,password);
      setPassword(""); toast.success("Portal aktif dan password tersimpan"); window.location.reload();
    } catch(e){toast.error(e instanceof Error?e.message:"Gagal menyimpan password");} finally{setLoading(false);}
  }
  async function copy(){await navigator.clipboard.writeText(portalUrl);setCopied(true);toast.success("Link portal disalin");setTimeout(()=>setCopied(false),2000);}
  async function revoke(){setLoading(true);try{await revokePortalToken(client.id);toast.success("Akses portal dicabut");window.location.reload();}finally{setLoading(false);}}

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4"/> Portal Klien</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2"><Badge variant={active?"default":"secondary"}>{active?"Aktif":"Nonaktif"}</Badge><span className="text-xs text-muted-foreground">Link selalu tersedia. Konten hanya terbuka setelah password benar.</span></div>
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium">Link portal</p>
        <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-2 text-xs">{portalUrl}</code>
          <Button variant="outline" size="icon" onClick={copy}>{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</Button>
          <Button variant="outline" size="icon" asChild><a href={portalUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4"/></a></Button>
        </div>
      </div>
      <div className="space-y-2"><label htmlFor="portal-password" className="text-sm font-medium">{client.portalPasswordHash?"Ganti password":"Atur password"}</label>
        <div className="flex flex-col gap-2 sm:flex-row"><Input id="portal-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} placeholder="Minimal 8 karakter" autoComplete="new-password"/>
          <Button onClick={savePassword} disabled={loading||password.length<8} className="gap-1"><KeyRound className="h-4 w-4"/>{loading?"Menyimpan...":"Simpan & aktifkan"}</Button></div>
      </div>
      {client.portalEnabled && <Button variant="outline" size="sm" className="gap-1 text-red-600" onClick={revoke} disabled={loading}><X className="h-3 w-3"/>Cabut akses</Button>}
    </CardContent>
  </Card>;
}
