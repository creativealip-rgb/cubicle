"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { sendContract } from "@/lib/actions/contracts";

export function SendContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      try {
        const { token } = await sendContract({ contractId });
        const url = `${window.location.origin}/contract/${token}`;
        setLink(url);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || "Send failed");
      }
    });
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm font-medium">✓ Sent. Share this link with your client:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-50 border rounded px-2 py-1.5 truncate">{link}</code>
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button onClick={handleSend} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
      Send for signature
    </Button>
  );
}
