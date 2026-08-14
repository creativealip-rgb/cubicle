"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  kind: "proposal" | "contract";
  initial: { clientName: string; clientEmail: string; companyName: string; title: string };
  update: (input: { clientName: string; clientEmail: string | null; companyName: string | null; title: string }) => Promise<unknown>;
};

export function DocumentDetailsForm({ kind, initial, update }: Props) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return <form className="rounded-lg border bg-white p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { try { await update({ ...value, clientEmail: value.clientEmail || null, companyName: value.companyName || null }); toast.success(kind === "proposal" ? "Detail proposal tersimpan" : "Detail kontrak tersimpan"); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan"); } }); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>Nama client</Label><Input value={value.clientName} onChange={e => setValue(v => ({ ...v, clientName: e.target.value }))} required /></div>
      <div><Label>Email client</Label><Input type="email" value={value.clientEmail} onChange={e => setValue(v => ({ ...v, clientEmail: e.target.value }))} /></div>
      <div><Label>Nama perusahaan</Label><Input value={value.companyName} onChange={e => setValue(v => ({ ...v, companyName: e.target.value }))} /></div>
      <div><Label>Judul</Label><Input value={value.title} onChange={e => setValue(v => ({ ...v, title: e.target.value }))} required /></div>
    </div>
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan detail"}</Button>
  </form>;
}

export default DocumentDetailsForm;