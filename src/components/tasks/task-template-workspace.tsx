"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskTemplateImportDialog } from "@/components/tasks/task-template-import-dialog";
import {
  archiveTaskTemplate,
  createTaskTemplate,
  createTaskTemplateItem,
  duplicateTaskTemplate,
  removeTaskTemplateItem,
  reorderTaskTemplateItems,
  restoreTaskTemplate,
  updateTaskTemplate,
  updateTaskTemplateItem,
} from "@/lib/actions/task-templates";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";
import {
  LayoutTemplate,
  Plus,
  Copy,
  Archive,
  RotateCcw,
  CheckSquare2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TemplateItem = {
  id: string;
  title: string;
  description?: string | null;
  defaultAssigneeId?: string | null;
  position: number;
};

export type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  target: "fixed_price" | "hourly_retainer" | "all";
  status: "active" | "archived";
  items?: TemplateItem[];
};

function TemplateFormDialog({
  template,
  onSave,
}: {
  template?: TemplateRow;
  onSave: (value: {
    name: string;
    description?: string;
    target: "fixed_price" | "hourly_retainer" | "all";
  }) => Promise<void>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [target, setTarget] = useState<"fixed_price" | "hourly_retainer" | "all">(
    template?.target ?? "all"
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={template ? "outline" : "default"}
          className={cn(
            "rounded-xl font-semibold gap-1.5 shadow-xs",
            !template && "bg-primary text-primary-foreground"
          )}
        >
          {template ? (
            <>
              <Edit2 className="h-3.5 w-3.5" />
              {t("Ubah", "Edit")}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t("Buat Template Baru", "New Template")}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            {template
              ? t("Ubah Template Tugas", "Edit Task Template")
              : t("Buat Template Tugas Baru", "Create Task Template")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave({
              name,
              description: description || undefined,
              target,
            });
            setOpen(false);
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("Nama Template", "Template Name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Contoh: Checklist Onboarding Klien", "e.g. Client Onboarding Checklist")}
              className="rounded-xl h-10 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("Deskripsi", "Description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Penjelasan singkat penggunaan template...", "Short note about this template...")}
              className="rounded-xl h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("Target Model Proyek", "Target Project Model")}</Label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value as typeof target)}
            >
              <option value="all">{t("Semua Jenis Proyek", "All Project Types")}</option>
              <option value="fixed_price">{t("Harga Tetap", "Fixed Price")}</option>
              <option value="hourly_retainer">{t("Per Jam / Retainer", "Hourly / Retainer")}</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button type="submit" className="rounded-xl font-semibold">
              {t("Simpan Template", "Save Template")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemFormDialog({
  item,
  onSave,
}: {
  item?: TemplateItem;
  onSave: (value: {
    title: string;
    description?: string;
    defaultAssigneeId?: string | null;
  }) => Promise<void>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(item?.defaultAssigneeId ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
            <Edit2 className="h-3 w-3" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t("Tambah Tugas", "Add Task")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare2 className="h-5 w-5 text-primary" />
            {item ? t("Ubah Item Tugas", "Edit Task Item") : t("Tambah Item ke Template", "Add Item to Template")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave({
              title,
              description: description || undefined,
              defaultAssigneeId: defaultAssigneeId || null,
            });
            setOpen(false);
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("Judul Tugas", "Task Title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Contoh: Setup akun hosting dan DNS", "e.g. Setup hosting and DNS")}
              className="rounded-xl h-10 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("Deskripsi / Checklist (Opsional)", "Description / Checklist (Optional)")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Detail instruksi atau langkah pekerjaan...", "Detailed instructions...")}
              className="rounded-xl h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("ID Petugas Bawaan (Opsional)", "Default Assignee ID (Optional)")}</Label>
            <Input
              value={defaultAssigneeId}
              onChange={(e) => setDefaultAssigneeId(e.target.value)}
              placeholder="user_id..."
              className="rounded-xl h-10 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button type="submit" className="rounded-xl font-semibold">
              {t("Simpan Item", "Save Item")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskTemplateWorkspace({
  templates,
  projects,
}: {
  templates: TemplateRow[];
  projects: Array<{ id: string; name: string }>;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi gagal");
    }
  }

  function moveItem(templateId: string, all: TemplateItem[], index: number, direction:"up"|"down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= all.length) return;
    const ids = all.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderTaskTemplateItems(templateId, ids));
  }

  return (
    <div className="space-y-6">
      {/* Top Action & Import Bar */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <TemplateFormDialog
            onSave={(value) => run(() => createTaskTemplate({ ...value, status: "active" }))}
          />

          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                {t("Terapkan ke Proyek:", "Apply to Project:")}
              </span>
              <select
                className="h-8 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projectId && (
                <TaskTemplateImportDialog
                  projectId={projectId}
                  templates={templates.map(({ id, name: label, target }) => ({ id, name: label, target }))}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="h-4 w-4 text-primary" />
          <span>
            {templates.length} {t("Template Aktif", "Active Templates")}
          </span>
        </div>
      </div>

      {/* Template Cards Grid */}
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {t("Belum ada template tugas.", "No task templates yet.")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {t(
              "Buat paket checklist tugas standar yang sering digunakan berulang kali agar bisa diimpor ke proyek manapun dengan 1-klik.",
              "Create reusable task checklists to import into any project in one click."
            )}
          </p>
          <div className="mt-4">
            <TemplateFormDialog
              onSave={(value) => run(() => createTaskTemplate({ ...value, status: "active" }))}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const itemCount = template.items?.length ?? 0;
            const targetName =
              template.target === "fixed_price"
                ? t("Harga Tetap", "Fixed Price")
                : template.target === "hourly_retainer"
                ? t("Per Jam / Retainer", "Hourly / Retainer")
                : t("Semua Proyek", "All Projects");

            return (
              <div
                key={template.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-primary/40",
                  template.status === "archived"
                    ? "border-dashed opacity-60 bg-muted/20"
                    : "border-border/80"
                )}
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <LayoutTemplate className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate" title={template.name}>
                          {template.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded-md bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground uppercase">
                            {targetName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            • {itemCount} {t("tugas", "tasks")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {template.status === "active" && (
                        <TemplateFormDialog
                          template={template}
                          onSave={(value) => run(() => updateTaskTemplate(template.id, value))}
                        />
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Checklist Sub-Items */}
                  <div className="mt-3.5 space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <CheckSquare2 className="h-3 w-3 text-primary" />
                        {t("Daftar Tugas Checklist", "Checklist Items")}
                      </span>
                      {template.status === "active" && (
                        <ItemFormDialog
                          onSave={(value) =>
                            run(() =>
                              createTaskTemplateItem(template.id, {
                                ...value,
                                position: template.items?.length ?? 0,
                              })
                            )
                          }
                        />
                      )}
                    </div>

                    {itemCount === 0 ? (
                      <p className="py-3 text-center text-[11px] text-muted-foreground italic">
                        {t("Belum ada item tugas di template ini", "No task items in this template")}
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                        {(template.items ?? []).map((item, index, all) => (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs shadow-2xs border border-border/40"
                          >
                            <span className="font-medium text-foreground truncate flex-1">
                              {item.title}
                            </span>

                            {template.status === "active" && (
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <ItemFormDialog
                                  item={item}
                                  onSave={(value) => run(() => updateTaskTemplateItem(item.id, value))}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={index===0}
                                  onClick={() => moveItem(template.id, all, index, "up")}
                                  className="h-6 w-6 rounded text-muted-foreground hover:text-foreground"
                                  title={t("Pindah ke atas", "Move up")}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={index===all.length-1}
                                  onClick={() => moveItem(template.id, all, index, "down")}
                                  className="h-6 w-6 rounded text-muted-foreground hover:text-foreground"
                                  title={t("Pindah ke bawah", "Move down")}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => run(() => removeTaskTemplateItem(item.id))}
                                  className="h-6 w-6 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  title={t("Hapus", "Delete")}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-lg font-medium gap-1"
                    onClick={() => run(() => duplicateTaskTemplate(template.id))}
                  >
                    <Copy className="h-3 w-3" />
                    {t("Duplikat", "Duplicate")}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs rounded-lg font-medium text-muted-foreground hover:text-foreground gap-1"
                    onClick={() =>
                      run(() =>
                        template.status === "active"
                          ? archiveTaskTemplate(template.id)
                          : restoreTaskTemplate(template.id)
                      )
                    }
                  >
                    {template.status === "active" ? (
                      <>
                        <Archive className="h-3 w-3" />
                        {t("Arsipkan", "Archive")}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        {t("Pulihkan", "Restore")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
