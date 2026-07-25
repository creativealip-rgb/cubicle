"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Calendar, Loader2 } from "lucide-react";
import { createClientPortalRequest } from "@/lib/actions/portal-requests";
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
}: {
  token: string;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"report" | "meeting" | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [reportPeriod, setReportPeriod] = useState("30 hari terakhir");
  const [preferredDate, setPreferredDate] = useState("");

  function close() {
    if (loading) return;
    setKind(null);
    setMessage("");
    setProjectId("");
    setReportPeriod("30 hari terakhir");
    setPreferredDate("");
  }

  async function submit() {
    if (!kind) return;
    setLoading(true);
    try {
      await createClientPortalRequest({
        token,
        kind,
        message: message || null,
        projectId: projectId || null,
        reportPeriod: kind === "report" ? reportPeriod || null : null,
        preferredDate: kind === "meeting" ? preferredDate || null : null,
      });
      toast.success(
        kind === "report"
          ? "Permintaan laporan terkirim ke tim"
          : "Permintaan pertemuan terkirim ke tim",
      );
      close();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 rounded-lg px-4"
          onClick={() => setKind("report")}
        >
          <BarChart3 className="h-4 w-4" />
          Minta Laporan
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 rounded-lg px-4"
          onClick={() => setKind("meeting")}
        >
          <Calendar className="h-4 w-4" />
          Ajukan Pertemuan
        </Button>
      </div>

      <Dialog open={kind !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {kind === "report" ? "Minta Laporan" : "Ajukan Pertemuan"}
            </DialogTitle>
            <DialogDescription>
              {kind === "report"
                ? "Tim akan siapkan ringkasan progress / jam / invoice sesuai permintaan."
                : "Tim akan hubungi kamu untuk jadwalkan meeting."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {projects.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Proyek (opsional)</Label>
                <Select
                  value={projectId || "none"}
                  onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua proyek</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {kind === "report" && (
              <div className="space-y-1.5">
                <Label htmlFor="report-period" className="text-xs">
                  Periode
                </Label>
                <Input
                  id="report-period"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  placeholder="30 hari terakhir / Bulan ini"
                />
              </div>
            )}

            {kind === "meeting" && (
              <div className="space-y-1.5">
                <Label htmlFor="preferred-date" className="text-xs">
                  Tanggal preferensi (opsional)
                </Label>
                <Input
                  id="preferred-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="request-message" className="text-xs">
                Catatan
              </Label>
              <Textarea
                id="request-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  kind === "report"
                    ? "Mis. butuh ringkasan jam billable + status task…"
                    : "Mis. topik meeting, zona waktu, jam preferensi…"
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim…
                </>
              ) : (
                "Kirim permintaan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
