"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generatePortalToken, revokePortalToken } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, RefreshCw, X } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generatePortalToken(client.id);
      setShowToken(result.token);
      toast.success("Portal token generated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await revokePortalToken(client.id);
      setShowToken(null);
      toast.success("Portal token revoked");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (showToken) {
      await navigator.clipboard.writeText(showToken);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopyShortLink() {
    if (!client.portalSlug) return;
    const url = `${window.location.origin}/client-portal/${client.portalSlug}`;
    await navigator.clipboard.writeText(url);
    setCopiedShort(true);
    toast.success("Short portal URL copied");
    setTimeout(() => setCopiedShort(false), 2000);
  }

  const isExpired = client.portalTokenExpiresAt
    ? new Date(client.portalTokenExpiresAt) < new Date()
    : false;
  const isRevoked = !!client.portalTokenRevokedAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" /> Client Portal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={client.portalEnabled && !isRevoked ? "default" : "secondary"}>
            {client.portalEnabled && !isRevoked ? "Enabled" : "Disabled"}
          </Badge>
          {client.portalTokenExpiresAt && !isRevoked && (
            <span className="text-xs text-muted-foreground">
              Expires: {new Date(client.portalTokenExpiresAt).toLocaleDateString()}
              {isExpired && <Badge variant="destructive" className="ml-1 text-[10px]">Expired</Badge>}
            </span>
          )}
          {isRevoked && (
            <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
          )}
        </div>

        {showToken && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Portal Token (shown only once)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
                {showToken}
              </code>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this token now. You won&apos;t see it again. Store hash in DB.
            </p>
          </div>
        )}

        {client.portalSlug && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">Short portal link</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="block flex-1 break-all rounded bg-background px-2 py-1 text-xs">
                /client-portal/{client.portalSlug}
              </code>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyShortLink}>
                {copiedShort ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {client.portalSlugEnabled ? "Slug enabled" : "Slug disabled"}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleGenerate}
            disabled={loading}
          >
            <RefreshCw className="h-3 w-3" />
            {loading ? "Generating..." : "Generate Token"}
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
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
