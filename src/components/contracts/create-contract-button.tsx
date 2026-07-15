"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createContract } from "@/lib/actions/contracts";

const DEFAULT_BODY = `# Perjanjian Jasa

Perjanjian ini dibuat antara **{{workspace.name}}** ("Penyedia") dan **{{client.name}}** ("Klien").

## 1. Lingkup pekerjaan

[Jelaskan deliverable yang akan dikerjakan.]

## 2. Jadwal

Pekerjaan dimulai pada {{today}}. Target selesai: [tanggal].

## 3. Pembayaran

Biaya proyek sesuai proposal yang disepakati. Syarat: 50% di muka, 50% saat serah terima.

## 4. Kerahasiaan

Kedua pihak menjaga kerahasiaan informasi proprietary.

## 5. Pengakhiran

Masing-masing pihak dapat mengakhiri perjanjian dengan pemberitahuan tertulis 14 hari. Pekerjaan yang sudah selesai akan ditagihkan proporsional.

## 6. Penerimaan

Dengan menandatangani di bawah, kedua pihak menyetujui syarat di atas.
`;

export function CreateContractButton({
  clients,
  workspaceId,
}: {
  clients: { id: string; name: string }[];
  workspaceId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [validUntil, setValidUntil] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!clientId) {
      toast.error("Pilih klien dulu");
      return;
    }
    if (!title.trim()) {
      toast.error("Isi judul kontrak");
      return;
    }
    startTransition(async () => {
      try {
        const c = await createContract({
          workspaceId,
          clientId,
          title: title.trim(),
          body,
          validUntil: validUntil || undefined,
        });
        setOpen(false);
        toast.success("Draf kontrak dibuat");
        router.push(`/app/contracts/${c.id}`);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal membuat kontrak";
        toast.error(msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Kontrak baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kontrak baru</DialogTitle>
          <DialogDescription>
            Mulai dari template, edit isinya, lalu kirim ke klien untuk tanda tangan elektronik.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Klien</label>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada klien. Buat klien dulu.
              </p>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih klien..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Judul</label>
            <Input
              placeholder="mis. Perjanjian Kerja Sama — Brand refresh"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Berlaku sampai (opsional)
            </label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Isi kontrak
              <span className="text-xs text-slate-500 ml-2 font-normal">
                Placeholder: {`{{client.name}}`}, {`{{workspace.name}}`},{" "}
                {`{{today}}`}, {`{{valid_until}}`}
              </span>
            </label>
            <Textarea
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={pending || clients.length === 0}>
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Buat draf
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
