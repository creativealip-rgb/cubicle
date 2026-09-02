"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface GoalDialogProps {
  lang?: string;
  createGoalAction: (fd: FormData) => Promise<void>;
}

export function GoalDialog({ lang = "id", createGoalAction }: GoalDialogProps) {
  const isEn = lang === "en";
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white shadow-none transition hover:bg-violet-700">
          <Plus className="size-3.5" />
          <span>{isEn ? "Add Goal" : "Tambah Tujuan"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base font-bold">
            {isEn ? "Create New Goal" : "Buat Tujuan Baru"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await createGoalAction(fd);
            setOpen(false);
          }}
          className="mt-2 space-y-3"
        >
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Goal Title" : "Judul Tujuan"}
            </label>
            <Input
              name="title"
              required
              placeholder={isEn ? "e.g. 6-Month Emergency Fund" : "Contoh: Dana Darurat 6 Bulan"}
              className="h-8 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Description" : "Deskripsi"}
            </label>
            <Textarea
              name="description"
              placeholder={isEn ? "Target details or motivation (optional)" : "Rincian target atau motivasi (opsional)"}
              className="rounded-lg text-xs"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Life Area" : "Area Hidup"}
              </label>
              <Input
                name="lifeArea"
                required
                placeholder={isEn ? "Finance / Career" : "Keuangan / Karir"}
                className="h-8 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Target Deadline" : "Tenggat Waktu"}
              </label>
              <Input name="deadline" type="date" className="h-8 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Priority" : "Prioritas"}
              </label>
              <select
                name="priority"
                defaultValue="medium"
                className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
              >
                <option value="low">{isEn ? "Low" : "Rendah"}</option>
                <option value="medium">{isEn ? "Medium" : "Sedang"}</option>
                <option value="high">{isEn ? "High" : "Tinggi"}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Manual Progress (%)" : "Progress Manual (%)"}
              </label>
              <Input
                name="manualProgress"
                type="number"
                min="0"
                max="100"
                defaultValue="0"
                className="h-8 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg text-xs"
            >
              {isEn ? "Cancel" : "Batal"}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-none hover:bg-violet-700"
            >
              {isEn ? "Save Goal" : "Simpan Tujuan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
