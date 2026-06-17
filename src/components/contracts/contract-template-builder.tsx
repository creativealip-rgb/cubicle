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
  { key: "client.name", desc: "Client's full name" },
  { key: "client.email", desc: "Client's email" },
  { key: "client.company", desc: "Client's company" },
  { key: "project.name", desc: "Project name" },
  { key: "workspace.name", desc: "Your workspace name" },
  { key: "today", desc: "Today's date" },
  { key: "valid_until", desc: "Contract expiration date" },
  { key: "value", desc: "Total contract value" },
  { key: "scope", desc: "Project scope summary" },
];

const DEFAULT_BODY = `# Service Agreement

This Service Agreement ("Agreement") is entered into on **{{today}}** between:

**Provider:** {{workspace.name}}
**Client:** {{client.name}} <{{client.email}}>

---

## 1. Scope of Work

Provider agrees to deliver the following services for **{{project.name}}**:

{{scope}}

## 2. Compensation

Total contract value: **{{value}}**

Payment terms: 50% upfront, 50% upon delivery.

## 3. Timeline

This Agreement is valid until **{{valid_until}}**.

## 4. Confidentiality

Both parties agree to keep confidential information private.

## 5. Termination

Either party may terminate this Agreement with 14 days written notice.

---

By signing below, both parties agree to the terms outlined above.
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
  const canSave = name.trim().length > 0 && body.trim().length > 0 && !saving && !deleting;

  function insertVariable(varKey: string) {
    setBody((b) => b + `{{${varKey}}}`);
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      try {
        if (isEdit && template) {
          await updateContractTemplate(template.id, { name, body, isDefault });
          router.push("/app/contract-templates");
        } else {
          const created = await createContractTemplate({ workspaceId, name, body, isDefault });
          router.push(`/app/contract-templates/${created.id}`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save template");
      }
    });
  }

  function onDelete() {
    if (!template) return;
    if (!confirm(`Delete template "${template.name}"? Existing contracts won't be affected.`)) return;
    setError(null);
    startDelete(async () => {
      try {
        await deleteContractTemplate(template.id);
        router.push("/app/contract-templates");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete template");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/contract-templates">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit template" : "New contract template"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Write once, reuse for every client. Placeholders auto-fill when sending.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          )}
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {isEdit ? "Save changes" : "Create template"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Template name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Service Agreement"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-body">Contract body</Label>
              <span className="text-xs text-slate-500">{body.length.toLocaleString()} chars</span>
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
            <Label htmlFor="tpl-default" className="cursor-pointer flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Set as default template
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Available variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-xs text-slate-500 mb-2">
                Click to insert. Filled at send time.
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

          {isDefault && (
            <Badge variant="default" className="gap-1 w-fit">
              <Star className="h-3 w-3" />
              Default template
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
