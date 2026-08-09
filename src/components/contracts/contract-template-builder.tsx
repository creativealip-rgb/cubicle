"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-client";
import { ArrowLeft, Save, Loader2, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
} from "@/lib/actions/contracts";

type Props = {
  workspaceId: string;
  template?: {
    id: string;
    name: string;
    body: string;
    isDefault: boolean;
  };
};

const VARIABLES = [
  { key: "client.name" },
  { key: "client.email" },
  { key: "project.name" },
  { key: "workspace.name" },
  { key: "today" },
  { key: "valid_until" },
  { key: "value" },
  { key: "scope" },
];

const DEFAULT_BODY = `# Perjanjian Jasa

Perjanjian ini dibuat pada **{{today}}** antara:

**Penyedia:** {{workspace.name}}
**Klien:** {{client.name}} <{{client.email}}>

---

## 1. Lingkup pekerjaan

Penyedia setuju mengerjakan layanan untuk **{{project.name}}**:

{{scope}}

## 2. Kompensasi

Nilai kontrak: **{{value}}**

Syarat pembayaran: 50% di muka, 50% saat serah terima.

## 3. Jadwal

Perjanjian berlaku sampai **{{valid_until}}**.

## 4. Kerahasiaan

Kedua pihak menjaga kerahasiaan informasi proprietary.

## 5. Pengakhiran

Masing-masing pihak dapat mengakhiri perjanjian dengan pemberitahuan tertulis 14 hari.

---

Dengan menandatangani di bawah, kedua pihak menyetujui syarat di atas.
`;

export function ContractTemplateBuilder({ workspaceId, template }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [body, setBody] = useState(template?.body ?? DEFAULT_BODY);
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const variableDesc = (key: string): string =>
    ({
      "client.name": t("Nama klien", "Client name"),
      "client.email": t("Email klien", "Client email"),
      "project.name": t("Nama proyek", "Project name"),
      "workspace.name": t("Nama workspace", "Workspace name"),
      today: t("Tanggal hari ini", "Today's date"),
      valid_until: t("Berlaku sampai", "Valid until"),
      value: t("Nilai kontrak", "Contract value"),
      scope: t("Ringkasan lingkup", "Scope summary"),
    })[key] ?? key;

  const isEdit = !!template;
  const canSave =
    name.trim().length > 0 && body.trim().length > 0 && !saving && !deleting;

  function insertVariable(varKey: string) {
    setBody((b) => b + `{{${varKey}}}`);
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      try {
        if (isEdit && template) {
          await updateContractTemplate(template.id, { name, body, isDefault });
          toast.success(t("Template diperbarui", "Template updated"));
          router.push("/app/templates?tab=contract");
        } else {
          const created = await createContractTemplate({
            workspaceId,
            name,
            body,
            isDefault,
          });
          toast.success(t("Template dibuat", "Template created"));
          router.push(`/app/contract-templates/${created.id}`);
        }
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : t("Gagal menyimpan template", "Failed to save template");
        setError(msg);
        toast.error(msg);
      }
    });
  }

  function onDelete() {
    if (!template) return;
    if (
      !confirm(
        t(
          `Hapus template "${template.name}"? Kontrak yang sudah ada tidak terpengaruh.`,
          `Delete template "${template.name}"? Existing contracts are unaffected.`,
        ),
      )
    )
      return;
    setError(null);
    startDelete(async () => {
      try {
        await deleteContractTemplate(template.id);
        toast.success(t("Template dihapus", "Template deleted"));
        router.push("/app/templates?tab=contract");
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : t("Gagal menghapus template", "Failed to delete template");
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/app/templates?tab=contract">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {t("Pusat Template", "Template Center")}
            </Link>
          </Button>
          <h1 className="app-page-title">
            {isEdit ? t("Edit template", "Edit template") : t("Template kontrak baru", "New contract template")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Tulis sekali, pakai ulang untuk tiap klien. Placeholder terisi saat kirim.",
              "Write once, reuse for every client. Placeholders fill in when sent.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {t("Hapus", "Delete")}
            </Button>
          ) : null}
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {isEdit ? t("Simpan", "Save") : t("Buat template", "Create template")}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">{t("Nama template", "Template name")}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("mis. Perjanjian jasa standar", "e.g. Standard service agreement")}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-body">{t("Isi kontrak", "Contract body")}</Label>
              <span className="text-xs text-slate-500">
                {body.length.toLocaleString("id-ID")} {t("karakter", "characters")}
              </span>
            </div>
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={22}
              className="font-mono text-sm leading-relaxed"
              maxLength={50000}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="tpl-default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <Label
              htmlFor="tpl-default"
              className="cursor-pointer flex items-center gap-1.5"
            >
              <Star className="h-3.5 w-3.5 text-amber-500" />
              {t("Jadikan template default", "Make default template")}
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t("Variabel tersedia", "Available variables")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-slate-500 mb-2">
                {t(
                  "Klik untuk sisipkan. Terisi saat kontrak dikirim.",
                  "Click to insert. Fills in when the contract is sent.",
                )}
              </p>
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 transition-colors group"
                  type="button"
                >
                  <code className="text-xs font-mono text-violet-700 group-hover:text-violet-900">
                    {`{{${v.key}}}`}
                  </code>
                  <p className="text-xs text-slate-500 mt-0.5">{variableDesc(v.key)}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {isDefault ? (
            <Badge variant="default" className="gap-1 w-fit">
              <Star className="h-3 w-3" />
              {t("Template default", "Default template")}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
