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
  t: (id: string, en: string) => string;
  createGoalAction: (fd: FormData) => Promise<void>;
}

export function GoalDialog({ t, createGoalAction }: GoalDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-violet-600 font-semibold text-white shadow-sm transition hover:bg-violet-700">
          <Plus className="mr-1.5 size-4" />
          {t("Tambah Tujuan", "Add Goal")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t("Buat Tujuan Baru", "Create New Goal")}
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
              {t("Judul Tujuan", "Goal Title")}
            </label>
            <Input
              name="title"
              required
              placeholder={t("Contoh: Dana Darurat 6 Bulan", "e.g. 6-Month Emergency Fund")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Deskripsi", "Description")}
            </label>
            <Textarea
              name="description"
              placeholder={t(
                "Rincian target atau motivasi (opsional)",
                "Target details or motivation (optional)",
              )}
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Area Hidup", "Life Area")}
              </label>
              <Input
                name="lifeArea"
                required
                placeholder={t("Keuangan / Karir", "Finance / Career")}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Tenggat Waktu", "Target Deadline")}
              </label>
              <Input name="deadline" type="date" className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Prioritas", "Priority")}
              </label>
              <select
                name="priority"
                defaultValue="medium"
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="low">{t("Rendah", "Low")}</option>
                <option value="medium">{t("Sedang", "Medium")}</option>
                <option value="high">{t("Tinggi", "High")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Progress Manual (%)", "Manual Progress (%)")}
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
              {t("Simpan Tujuan", "Save Goal")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
