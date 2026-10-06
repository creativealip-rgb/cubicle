"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Calendar, PlusCircle, Loader2, Send } from "lucide-react";
import { createClientPortalRequest } from "@/lib/actions/portal-requests";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectOption = { id: string; name: string };

export function PortalActionButtons({
  token,
  projects,
  bookingSlug,
}: {
  token: string;
  projects: ProjectOption[];
  bookingSlug?: string | null;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [kind, setKind] = useState<"meeting" | "task_request" | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
  );

  function close() {
    if (loading) return;
    setKind(null);
    setTitle("");
    setMessage("");
    setProjectId("");
    setPreferredDate("");
    setPreferredTime("");
    setDurationMinutes("60");
  }

  async function submit() {
    if (!kind) return;
    setLoading(true);
    try {
      await createClientPortalRequest({
        token,
        kind,
        title: kind === "task_request" ? title || null : null,
        message: message || null,
        projectId: projectId || null,
        preferredDate: preferredDate || null,
        preferredTime: kind === "meeting" ? preferredTime || null : null,
        durationMinutes: kind === "meeting" ? Number(durationMinutes) : null,
        timezone: kind === "meeting" ? timezone : null,
      });
      toast.success(
        kind === "task_request"
          ? t("Permintaan tugas baru terkirim ke tim", "New task request sent to the team")
          : t("Permintaan pertemuan terkirim ke tim", "Meeting request sent to the team")
      );
      close();
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal kirim request", "Failed to send request"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setKind("task_request")}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {t("Ajukan Request Baru", "New Request")}
        </Button>
        {bookingSlug ? (
          <Button
            asChild
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs bg-blue-600 hover:bg-purple-700 text-white cursor-pointer"
          >
            <a href={`/booking/${bookingSlug}`} target="_blank" rel="noreferrer">
              <Calendar className="h-3.5 w-3.5" />
              {t("Booking Jadwal", "Schedule Meeting")}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs bg-blue-600 hover:bg-purple-700 text-white cursor-pointer"
            onClick={() => setKind("meeting")}
          >
            <Calendar className="h-3.5 w-3.5" />
            {t("Ajukan Pertemuan", "Schedule Meeting")}
          </Button>
        )}
      </div>

      {/* Schedule Meeting Dialog */}
      <Dialog open={kind === "meeting"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" />
              {t("Ajukan Jadwal Pertemuan", "Schedule Meeting")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "Pilih jadwal yang kamu inginkan. Tim akan mengonfirmasi atau menawarkan waktu alternatif.",
                "Pick your preferred time. The team will confirm or offer an alternative slot.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            {projects.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="req-proj" className="text-xs">{t("Terkait Proyek (opsional)", "Related Project (optional)")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="req-proj" className="h-8 text-xs">
                    <SelectValue placeholder={t("Pilih proyek...", "Select project...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("Umum (tanpa proyek)", "General (no project)")}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="req-date" className="text-xs">{t("Tanggal Pilihan", "Preferred Date")}</Label>
                <Input
                  id="req-date"
                  type="date"
                  className="h-8 text-xs"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="req-time" className="text-xs">{t("Jam (WIB)", "Preferred Time")}</Label>
                <Input
                  id="req-time"
                  type="time"
                  className="h-8 text-xs"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-msg" className="text-xs">{t("Agenda / Topik Pembahasan", "Meeting Agenda")}</Label>
              <Textarea
                id="req-msg"
                placeholder={t(
                  "Contoh: Pembahasan revisi mockup landing page dan persiapan peluncuran.",
                  "E.g., Review landing page mockups and launch preparation.",
                )}
                className="min-h-[72px] text-xs resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={close}
              disabled={loading}
              className="text-xs h-8"
            >
              {t("Batal", "Cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={loading || !message.trim()}
              className="text-xs h-8 bg-blue-600 hover:bg-purple-700 text-white gap-1"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {t("Kirim Pengajuan", "Send Request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task / Deliverable Request Dialog */}
      <Dialog open={kind === "task_request"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4 text-primary" />
              {t("Ajukan Permintaan / Tugas Baru", "Submit New Task Request")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "Sampaikan permintaan pekerjaan atau revisi baru ke tim workspace.",
                "Submit a new deliverable, task, or revision request to the workspace team.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            {projects.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="task-proj" className="text-xs">{t("Terkait Proyek (opsional)", "Related Project (optional)")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="task-proj" className="h-8 text-xs">
                    <SelectValue placeholder={t("Pilih proyek...", "Select project...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("Umum (tanpa proyek)", "General (no project)")}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="task-title" className="text-xs">{t("Judul Permintaan *", "Request Title *")}</Label>
              <Input
                id="task-title"
                placeholder={t("Contoh: Tambah halaman About Us & Form Kontak", "E.g., Add About Us page & Contact Form")}
                className="h-8 text-xs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-due" className="text-xs">{t("Target Selesai (opsional)", "Target Date (optional)")}</Label>
              <Input
                id="task-due"
                type="date"
                className="h-8 text-xs"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-msg" className="text-xs">{t("Rincian Instruksi / Catatan", "Details & Instructions")}</Label>
              <Textarea
                id="task-msg"
                placeholder={t(
                  "Jelaskan secara singkat apa yang perlu dikerjakan atau diubah...",
                  "Briefly describe what needs to be done or revised...",
                )}
                className="min-h-[80px] text-xs resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={close}
              disabled={loading}
              className="text-xs h-8"
            >
              {t("Batal", "Cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={loading || !title.trim()}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {t("Kirim Request", "Submit Request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
