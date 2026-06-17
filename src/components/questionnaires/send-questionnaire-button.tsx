"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { sendQuestionnaire } from "@/lib/actions/questionnaires";

export function SendQuestionnaireButton({
  questionnaireId,
  clients,
  projects,
}: {
  questionnaireId: string;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    if (!clientId) {
      alert("Pick a client first");
      return;
    }
    startTransition(async () => {
      try {
        const { token } = await sendQuestionnaire({
          questionnaireId,
          clientId,
          projectId: projectId || undefined,
        });
        const url = `${window.location.origin}/intake/${token}`;
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
          <Button size="sm" variant="ghost" onClick={() => { setLink(null); setOpen(false); }}>
            Send to another client
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Send className="h-4 w-4 mr-1" />
        Send to client
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3 w-80">
        <div>
          <label className="text-sm font-medium block mb-1">Client</label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Project (optional)</label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSend} disabled={pending || !clientId}>
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
