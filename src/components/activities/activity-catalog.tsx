"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import {
  archiveActivity,
  createActivity,
  updateActivity,
} from "@/lib/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Archive, Pencil } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export type CatalogActivity = {
  id: string;
  name: string;
  defaultBillable: boolean;
  defaultHourlyRate: string | number | null;
  status: "active" | "archived" | string;
};

interface ActivityCatalogProps {
  activities: CatalogActivity[];
}

export function ActivityCatalog({ activities }: ActivityCatalogProps) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<CatalogActivity | null>(null);
  const [name, setName] = useState("");
  const [defaultBillable, setDefaultBillable] = useState(true);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState("");

  const rows = useMemo(() => {
    if (statusFilter === "all") return activities;
    return activities.filter((row) => row.status === "active");
  }, [activities, statusFilter]);

  function resetForm() {
    setName("");
    setDefaultBillable(true);
    setDefaultHourlyRate("");
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(row: CatalogActivity) {
    setEditing(row);
    setName(row.name);
    setDefaultBillable(row.defaultBillable);
    setDefaultHourlyRate(
      row.defaultHourlyRate == null ? "" : String(row.defaultHourlyRate),
    );
    setEditOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("Nama activity wajib", "Activity name required"));
      return;
    }
    setLoading(true);
    try {
      await createActivity({
        name: name.trim(),
        defaultBillable,
        defaultHourlyRate: defaultHourlyRate
          ? Number(defaultHourlyRate)
          : null,
      });
      toast.success(t("Activity dibuat", "Activity created"));
      setOpen(false);
      resetForm();
      refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal membuat activity", "Failed to create activity"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!name.trim()) {
      toast.error(t("Nama activity wajib", "Activity name required"));
      return;
    }
    setLoading(true);
    try {
      await updateActivity(editing.id, {
        name: name.trim(),
        defaultBillable,
        defaultHourlyRate: defaultHourlyRate
          ? Number(defaultHourlyRate)
          : null,
      });
      toast.success(t("Activity diperbarui", "Activity updated"));
      setEditOpen(false);
      resetForm();
      refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal update activity", "Failed to update activity"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(row: CatalogActivity) {
    setLoading(true);
    try {
      await archiveActivity(row.id);
      toast.success(t("Activity diarsipkan", "Activity archived"));
      refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal arsip activity", "Failed to archive activity"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="app-page-title">{t("Activity", "Activities")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Katalog activity workspace untuk timer dan timesheet",
              "Workspace activity catalog for timer and timesheet",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value === "all" ? "all" : "active")
            }
          >
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("Aktif", "Active")}</SelectItem>
              <SelectItem value="all">{t("Semua", "All")}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={openCreate}>
                <Plus className="h-3 w-3" />
                {t("Tambah", "Add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{t("Activity baru", "New Activity")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Nama", "Name")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="create-billable"
                    type="checkbox"
                    checked={defaultBillable}
                    onChange={(e) => setDefaultBillable(e.target.checked)}
                  />
                  <Label htmlFor="create-billable" className="text-xs">
                    {t("Default billable", "Default billable")}
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t("Tarif default", "Default rate")}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={defaultHourlyRate}
                    onChange={(e) => setDefaultHourlyRate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("Simpan", "Save")
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t("Belum ada activity", "No activities yet")}
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{row.name}</p>
                    <Badge
                      variant={
                        row.status === "active" ? "default" : "secondary"
                      }
                    >
                      {row.status === "active"
                        ? t("Aktif", "Active")
                        : t("Arsip", "Archived")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.defaultBillable
                      ? t("Billable", "Billable")
                      : t("Non-billable", "Non-billable")}
                    {row.defaultHourlyRate != null && row.defaultHourlyRate !== ""
                      ? ` · ${row.defaultHourlyRate}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => openEdit(row)}
                    disabled={loading || row.status !== "active"}
                  >
                    <Pencil className="h-3 w-3" />
                    {t("Ubah", "Edit")}
                  </Button>
                  {row.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleArchive(row)}
                      disabled={loading}
                    >
                      <Archive className="h-3 w-3" />
                      {t("Arsip", "Archive")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("Ubah Activity", "Edit Activity")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Nama", "Name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-billable"
                type="checkbox"
                checked={defaultBillable}
                onChange={(e) => setDefaultBillable(e.target.checked)}
              />
              <Label htmlFor="edit-billable" className="text-xs">
                {t("Default billable", "Default billable")}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("Tarif default", "Default rate")}
              </Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
                className="h-9"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("Simpan", "Save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
