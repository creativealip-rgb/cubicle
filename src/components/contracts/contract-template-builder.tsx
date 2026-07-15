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
  { key: "client.name", desc: "Nama klien" },
  { key: "client.email", desc: "Email klien" },
  { key: "project.name", desc: "Nama proyek" },
  { key: "workspace.name", desc: "Nama workspace" },
  { key: "today", desc: "Tanggal hari ini" },
  { key: "valid_until", desc: "Berlaku sampai" },
  { key: "value", desc: "Nilai kontrak" },
  { key: "scope", desc: "Ringkasan lingkup" },
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
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [body, setBody] = useState(template?.body ?? DEFAULT_BODY);
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          toast.success("Template diperbarui");
          router.push("/app/templates?tab=contract");
        } else {
          const created = await createContractTemplate({
            workspaceId,
            name,
            body,
            isDefault,
          });
          toast.success("Template dibuat");
          router.push(`/app/contract-templates/${created.id}`);
        }
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Gagal menyimpan template";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  function onDelete() {
    if (!template) return;
    if (
      !confirm(
        `Hapus template "${template.name}"? Kontrak yang sudah ada tidak terpengaruh.`,
      )
    )
      return;
    setError(null);
    startDelete(async () => {
      try {
        await deleteContractTemplate(template.id);
        toast.success("Template dihapus");
        router.push("/app/templates?tab=contract");
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Gagal menghapus template";
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
              Pusat Template
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit template" : "Template kontrak baru"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tulis sekali, pakai ulang untuk tiap klien. Placeholder terisi saat kirim.
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
              Hapus
            </Button>
          ) : null}
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {isEdit ? "Simpan" : "Buat template"}
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
            <Label htmlFor="tpl-name">Nama template</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Perjanjian jasa standar"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-body">Isi kontrak</Label>
              <span className="text-xs text-slate-500">
                {body.length.toLocaleString("id-ID")} karakter
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
              Jadikan template default
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Variabel tersedia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-slate-500 mb-2">
                Klik untuk sisipkan. Terisi saat kontrak dikirim.
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
                  <p className="text-xs text-slate-500 mt-0.5">{v.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {isDefault ? (
            <Badge variant="default" className="gap-1 w-fit">
              <Star className="h-3 w-3" />
              Template default
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
