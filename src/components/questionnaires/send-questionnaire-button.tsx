"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { sendQuestionnaire } from "@/lib/actions/questionnaires";
import { useT } from "@/lib/i18n-client";

export function SendQuestionnaireButton({
  questionnaireId,
  name,
  clients,
  projects,
}: {
  questionnaireId: string;
  /** Questionnaire name — used to build the email subject shown in the confirm dialog. */
  name?: string;
  clients: { id: string; name: string; email?: string | null }[];
  projects: { id: string; name: string }[];
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === clientId);
  const subject = name
    ? `Questionnaire: ${name}`
    : t("Kuesioner", "Questionnaire");

  function handleSend() {
    if (!clientId) {
      toast.error(t("Pilih klien dulu", "Pick a client first"));
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
        setOpen(false);
        refresh();
      } catch (err: any) {
        toast.error(err?.message || t("Gagal mengirim", "Send failed"));
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {t("✓ Terkirim. Bagikan tautan ini ke klien:", "✓ Sent. Share this link with your client:")}
        </span>
        <code className="max-w-[220px] truncate rounded border bg-muted/40 px-2 py-1 text-xs sm:max-w-[320px]">
          {link}
        </code>
        <Button size="sm" variant="outline" onClick={copyLink} className="h-7 px-2 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setLink(null);
            setOpen(true);
          }}
        >
          {t("Kirim ke klien lain", "Send to another client")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" />
        {t("Kirim ke klien", "Send to client")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Kirim kuesioner", "Send questionnaire")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Pilih klien, lalu periksa penerima dan subjek sebelum mengirim.",
                "Pick a client, then review the recipient and subject before sending.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                {t("Klien", "Client")}
              </label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("Pilih klien...", "Pick a client...")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` · ${c.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                {t("Proyek (opsional)", "Project (optional)")}
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("Tidak ada", "None")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">
                  {t("Penerima", "Recipient")}
                </span>
                <span className="min-w-0 break-words font-medium">
                  {selectedClient
                    ? [selectedClient.name, selectedClient.email]
                        .filter(Boolean)
                        .join(" · ")
                    : t("Belum ada penerima", "No recipient set")}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">
                  {t("Subjek", "Subject")}
                </span>
                <span className="min-w-0 break-words font-medium">
                  {subject}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleSend} disabled={pending || !clientId}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {pending
                ? t("Mengirim...", "Sending...")
                : t("Kirim", "Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
