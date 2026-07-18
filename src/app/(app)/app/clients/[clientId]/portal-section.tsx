"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generatePortalToken, revokePortalToken } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, RefreshCw, X, ExternalLink } from "lucide-react";

interface PortalTokenSectionProps {
  client: {
    id: string;
    portalEnabled: boolean;
    portalTokenHash: string | null;
    portalTokenExpiresAt: Date | string | null;
    portalTokenRevokedAt: Date | string | null;
    portalSlug?: string | null;
    portalSlugEnabled?: boolean;
  };
}

export function PortalTokenSection({ client }: PortalTokenSectionProps) {
  const [showToken, setShowToken] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generatePortalToken(client.id);
      const origin = window.location.origin;
      const url = `${origin}/client-portal/${result.token}`;
      setShowToken(result.token);
      setPortalUrl(url);
      toast.success("Portal aktif. Salin link & bagikan ke klien.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await revokePortalToken(client.id);
      setShowToken(null);
      setPortalUrl(null);
      toast.success("Portal dicabut");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyToken() {
    if (!showToken) return;
    await navigator.clipboard.writeText(showToken);
    setCopied(true);
    toast.success("Token disalin");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyUrl() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopiedUrl(true);
    toast.success("Link portal disalin");
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function handleCopyShortLink() {
    if (!client.portalSlug) return;
    const url = `${window.location.origin}/client-portal/${client.portalSlug}`;
    await navigator.clipboard.writeText(url);
    setCopiedShort(true);
    toast.success("Link singkat disalin");
    setTimeout(() => setCopiedShort(false), 2000);
  }

  const isExpired = client.portalTokenExpiresAt
    ? new Date(client.portalTokenExpiresAt) < new Date()
    : false;
  const isRevoked = !!client.portalTokenRevokedAt;
  const isActive = client.portalEnabled && !isRevoked && !isExpired;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" /> Portal Klien
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Cara aktifkan portal</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Klik <strong>Buat / perbarui token</strong> → salin link penuh.</li>
            <li>Upload file sebagai <strong>Hasil kerja</strong> atau set visibility <strong>Klien</strong>.</li>
            <li>Share project/task yang klien boleh lihat.</li>
            <li>Kirim link ke klien (WA/email). Klien bisa lihat file + komentar.</li>
          </ol>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Aktif" : "Nonaktif"}
          </Badge>
          {client.portalTokenExpiresAt && !isRevoked && (
            <span className="text-xs text-muted-foreground">
              Kedaluwarsa: {new Date(client.portalTokenExpiresAt).toLocaleDateString()}
              {isExpired && (
                <Badge variant="destructive" className="ml-1 text-[10px]">
                  Kedaluwarsa
                </Badge>
              )}
            </span>
          )}
          {isRevoked && (
            <Badge variant="destructive" className="text-[10px]">
              Dicabut
            </Badge>
          )}
          {client.portalTokenHash && !showToken && isActive && (
            <span className="text-xs text-muted-foreground">
              Token sudah ada (rahasia). Generate ulang untuk link baru.
            </span>
          )}
        </div>

        {portalUrl && showToken && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-emerald-900">Link portal (siap bagikan)</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
                  {portalUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopyUrl}
                >
                  {copiedUrl ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  asChild
                >
                  <a href={portalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Token mentah (hanya tampil sekali)
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
                  {showToken}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopyToken}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {client.portalSlug && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">Link portal singkat</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="block flex-1 break-all rounded bg-background px-2 py-1 text-xs">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/client-portal/${client.portalSlug}`
                  : `/client-portal/${client.portalSlug}`}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyShortLink}
              >
                {copiedShort ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {client.portalSlugEnabled ? "Slug aktif" : "Slug nonaktif"}
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleGenerate}
            disabled={loading}
          >
            <RefreshCw className="h-3 w-3" />
            {loading ? "Membuat..." : "Buat / perbarui token"}
          </Button>
          {client.portalEnabled && !isRevoked && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700"
              onClick={handleRevoke}
              disabled={loading}
            >
              <X className="h-3 w-3" />
              Cabut
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
