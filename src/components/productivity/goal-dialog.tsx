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
        <Button className="rounded-xl bg-violet-600 font-semibold text-white shadow-sm transition hover:bg-violet-700">
          <Plus className="mr-1.5 size-4" />
          {isEn ? "Add Goal" : "Tambah Tujuan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEn ? "Create New Goal" : "Buat Tujuan Baru"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await createGoalAction(fd);
            setOpen(false);
          }}
          className="mt-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Goal Title" : "Judul Tujuan"}
            </label>
            <Input
              name="title"
              required
              placeholder={isEn ? "e.g. 6-Month Emergency Fund" : "Contoh: Dana Darurat 6 Bulan"}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Description" : "Deskripsi"}
            </label>
            <Textarea
              name="description"
              placeholder={isEn ? "Target details or motivation (optional)" : "Rincian target atau motivasi (opsional)"}
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Life Area" : "Area Hidup"}
              </label>
              <Input
                name="lifeArea"
                required
                placeholder={isEn ? "Finance / Career" : "Keuangan / Karir"}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Target Deadline" : "Tenggat Waktu"}
              </label>
              <Input name="deadline" type="date" className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Priority" : "Prioritas"}
              </label>
              <select
                name="priority"
                defaultValue="medium"
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="low">{isEn ? "Low" : "Rendah"}</option>
                <option value="medium">{isEn ? "Medium" : "Sedang"}</option>
                <option value="high">{isEn ? "High" : "Tinggi"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Manual Progress (%)" : "Progress Manual (%)"}
              </label>
              <Input
                name="manualProgress"
                type="number"
                min="0"
                max="100"
                defaultValue="0"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-700">
              {isEn ? "Save Goal" : "Simpan Tujuan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
