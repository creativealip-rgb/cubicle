"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generatePortalToken, revealClientPortalPassword, revokePortalToken, setClientPortalPassword } from "@/lib/actions/clients";
import { resolveClientPortalPasswordState } from "@/lib/client-portal-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, X, ExternalLink, KeyRound, Eye, EyeOff } from "lucide-react";

interface Props {
  existingPortalToken: string | null;
  client: { id:string; portalEnabled:boolean; portalSlug:string|null; portalSlugEnabled:boolean; portalTokenHash:string|null; portalTokenExpiresAt:Date|string|null; portalTokenRevokedAt:Date|string|null; portalPasswordHash:string|null; portalPasswordCiphertext:string|null };
}

export function PortalTokenSection({ client }: Props) {
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [password,setPassword]=useState("");
  const [origin,setOrigin]=useState("");
  const [revealedPassword,setRevealedPassword]=useState<string|null>(null);
  useEffect(()=>setOrigin(window.location.origin),[]);
  const fallbackSlug=`client-${client.id.slice(0,8)}`;
  const slug=client.portalSlug || fallbackSlug;
  const portalUrl=`${origin}/client-portal/${slug}`;
  const active=client.portalEnabled && !!client.portalPasswordHash && !client.portalTokenRevokedAt;
  const passwordState=resolveClientPortalPasswordState(client);

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
  async function reveal(){setLoading(true);try{const result=await revealClientPortalPassword(client.id);if(result.state==="revealed")setRevealedPassword(result.password);else toast.error("Password lama tidak dapat ditampilkan");}catch(e){toast.error(e instanceof Error?e.message:"Gagal menampilkan password");}finally{setLoading(false);}}
  async function copyPassword(){if(!revealedPassword)return;await navigator.clipboard.writeText(revealedPassword);toast.success("Password disalin");}

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4"/> Portal Klien</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2"><Badge variant={active?"default":"secondary"}>{active?"Aktif":"Nonaktif"}</Badge><span className="text-xs text-muted-foreground">Link selalu tersedia. Konten hanya terbuka setelah password benar.</span></div>
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium">Link portal</p>
        <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-2 text-xs">{portalUrl}</code>
          <Button variant="outline" size="icon" onClick={copy} aria-label="Salin link portal" title="Salin link portal">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</Button>
          <Button variant="outline" size="icon" asChild><a href={portalUrl} target="_blank" rel="noreferrer" aria-label="Buka portal klien" title="Buka portal klien"><ExternalLink className="h-4 w-4"/></a></Button>
        </div>
      </div>
      {passwordState==="legacy"&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Password lama tidak dapat ditampilkan. Ganti password untuk mengaktifkan fitur tampilkan dan salin.</p>}
      {passwordState==="revealable"&&<div className="space-y-2 rounded-lg border p-3"><p className="text-xs font-medium">Password portal</p><div className="flex flex-wrap items-center gap-2"><code className="min-w-32 rounded bg-muted px-3 py-2 text-sm">{revealedPassword??"••••••••"}</code>{revealedPassword?<><Button type="button" variant="outline" size="sm" onClick={()=>setRevealedPassword(null)} aria-label="Sembunyikan password"><EyeOff className="mr-1 h-4 w-4"/>Sembunyikan password</Button><Button type="button" variant="outline" size="sm" onClick={copyPassword} aria-label="Salin password"><Copy className="mr-1 h-4 w-4"/>Salin password</Button></>:<Button type="button" variant="outline" size="sm" onClick={reveal} disabled={loading} aria-label="Tampilkan password"><Eye className="mr-1 h-4 w-4"/>Tampilkan password</Button>}</div></div>}
      <div className="space-y-2"><label htmlFor="portal-password" className="text-sm font-medium">{client.portalPasswordHash?"Ganti password":"Atur password"}</label>
        <div className="flex flex-col gap-2 sm:flex-row"><Input id="portal-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} placeholder="Minimal 8 karakter" autoComplete="new-password"/>
          <Button onClick={savePassword} disabled={loading||password.length<8} className="gap-1"><KeyRound className="h-4 w-4"/>{loading?"Menyimpan...":"Simpan & aktifkan"}</Button></div>
      </div>
      {client.portalEnabled && <Button variant="outline" size="sm" className="gap-1 text-red-600" onClick={revoke} disabled={loading}><X className="h-3 w-3"/>Cabut akses</Button>}
    </CardContent>
  </Card>;
}
