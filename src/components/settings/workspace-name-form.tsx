"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateWorkspaceName } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";

export function WorkspaceNameForm({
  defaultName,
  canEdit,
}: {
  defaultName: string;
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const next = name.trim();
    if (next.length < 2) {
      toast.error(t("Nama minimal 2 karakter", "Name needs at least 2 characters"));
      return;
    }
    if (next === defaultName) {
      toast.message(t("Tidak ada perubahan", "No changes"));
      return;
    }
    setLoading(true);
    try {
      await updateWorkspaceName({ name: next });
      toast.success(t("Nama workspace disimpan", "Workspace name saved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t("Nama", "Name")}</span>
        <span className="font-medium text-right">{defaultName}</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">{t("Nama workspace", "Workspace name")}</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder={t("Nama workspace", "Workspace name")}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            "Hanya owner yang bisa ubah nama. Slug tetap sama.",
            "Only owners can rename. Slug stays the same.",
          )}
        </p>
      </div>
      <Button type="submit" size="sm" disabled={loading || name.trim() === defaultName}>
        {loading ? t("Menyimpan…", "Saving…") : t("Simpan nama", "Save name")}
      </Button>
    </form>
  );
}
