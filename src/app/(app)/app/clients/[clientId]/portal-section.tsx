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

  return (
    <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 pb-2 border-b bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Globe className="h-4 w-4 text-primary" /> {t("Portal Klien", "Client Portal")}
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold h-5 px-2 rounded-full border ${
              active
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-border/80 bg-muted/60 text-muted-foreground"
            }`}
          >
            <span
              className={`mr-1 h-1.5 w-1.5 rounded-full ${
                active ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            {active ? t("Aktif", "Active") : t("Nonaktif", "Inactive")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3.5">
        <p className="text-xs text-muted-foreground">
          {t(
            "Link selalu tersedia. Konten hanya terbuka setelah password benar.",
            "Link is always available. Content only opens after correct password.",
          )}
        </p>

        {/* Portal link section */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">{t("Link portal", "Portal link")}</p>
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-1.5">
            <code className="min-w-0 flex-1 truncate px-1 text-xs font-mono font-medium text-foreground">
              {portalUrl}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={copy}
              aria-label={t("Salin link portal", "Copy portal link")}
              title={t("Salin link portal", "Copy portal link")}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              asChild
            >
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={t("Buka portal klien", "Open client portal")}
                title={t("Buka portal klien", "Open client portal")}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </Button>
          </div>
        </div>

        {passwordState === "legacy" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            {t(
              "Password lama tidak dapat ditampilkan. Ganti password untuk mengaktifkan fitur tampilkan dan salin.",
              "Legacy password cannot be displayed. Change password to enable show and copy features.",
            )}
          </p>
        )}

        {/* Password reveal section */}
        {passwordState === "revealable" && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground">{t("Password portal", "Portal password")}</p>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/20 p-1.5">
              <code className="px-1 font-mono text-xs font-medium text-foreground">
                {revealedPassword ?? "••••••••"}
              </code>
              <div className="flex items-center gap-1">
                {revealedPassword ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-lg px-2 text-xs font-semibold"
                      onClick={() => setRevealedPassword(null)}
                      aria-label={t("Sembunyikan password", "Hide password")}
                      title={t("Sembunyikan password", "Hide password")}
                    >
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("Sembunyikan", "Hide")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-lg px-2 text-xs font-semibold"
                      onClick={copyPassword}
                      aria-label={t("Salin password", "Copy password")}
                      title={t("Salin password", "Copy password")}
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("Salin", "Copy")}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 rounded-lg px-2 text-xs font-semibold"
                    onClick={reveal}
                    disabled={loading}
                    aria-label={t("Tampilkan password", "Show password")}
                    title={t("Tampilkan password", "Show password")}
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("Tampilkan", "Show")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Change / Set password */}
        <div className="space-y-1.5 pt-1">
          <label htmlFor="portal-password" className="text-xs font-semibold text-foreground">
            {client.portalPasswordHash ? t("Ganti password", "Change password") : t("Atur password", "Set password")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              placeholder={t("Minimal 8 karakter", "Minimum 8 characters")}
              autoComplete="new-password"
              className="h-8.5 rounded-xl text-xs"
            />
            <Button
              onClick={savePassword}
              disabled={loading || password.length < 8}
              className="h-8.5 gap-1.5 rounded-xl px-3 text-xs font-semibold shrink-0"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {loading ? t("Menyimpan...", "Saving...") : active ? t("Perbarui password", "Update password") : t("Simpan & aktifkan", "Save & activate")}
            </Button>
          </div>
        </div>

        {client.portalEnabled && (
          <div className="pt-1 border-t border-border/60 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={revoke}
              disabled={loading}
            >
              <X className="h-3 w-3" />
              {t("Cabut akses portal", "Revoke access")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
