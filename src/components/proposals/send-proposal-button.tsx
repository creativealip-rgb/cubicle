"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendProposal } from "@/lib/actions/proposals";

export function SendProposalButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await sendProposal(proposalId);
      const url = `${window.location.origin}/proposal/${result.token}`;
      setLink(url);
      toast.success("Proposal terkirim. Bagikan tautannya ke klien.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (link) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={copyLink} className="h-7 px-2 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSend} disabled={loading} className="h-7 px-2 text-xs">
      <Send className="h-3.5 w-3.5 mr-1" />
      {loading ? "Sending..." : "Send"}
    </Button>
  );
}
