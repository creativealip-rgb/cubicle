"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createQuestionnaire } from "@/lib/actions/questionnaires";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function QuestionnaireCreateDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await createQuestionnaire({
        name: name.trim(),
        description: description.trim() || undefined,
        schema: [
          { id: "field_name", label: t("Nama Lengkap", "Full Name"), type: "text", required: true },
          { id: "field_email", label: t("Email Utama", "Email Address"), type: "email", required: true },
          { id: "field_brief", label: t("Detail Kebutuhan", "Brief Details"), type: "textarea", required: true },
        ],
      });
      toast.success(t("Formulir berhasil dibuat", "Form created"));
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/app/questionnaires/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal membuat formulir", "Failed to create form"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {t("Buat formulir", "Create form")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Buat Formulir Baru", "Create New Form")}</DialogTitle>
          <DialogDescription>
            {t(
              "Buat formulir kustom untuk mengumpulkan brief & informasi dari klien.",
              "Create a custom form to gather briefs & information from clients.",
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="form-name">{t("Nama Formulir", "Form Name")} *</Label>
            <Input
              id="form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Contoh: Brief Desain Logo", "e.g. Logo Design Brief")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-desc">{t("Deskripsi / Petunjuk", "Description / Instructions")}</Label>
            <Textarea
              id="form-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Penjelasan singkat untuk klien mengenai isi formulir...", "Brief explanation for clients about the form...")}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Buat & Atur Field", "Create & Edit Fields")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
