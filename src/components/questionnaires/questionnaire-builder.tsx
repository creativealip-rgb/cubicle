"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, Loader2 } from "lucide-react";
import { createQuestionnaire } from "@/lib/actions/questionnaires";
import Link from "next/link";

type FieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "email" | "url";

type Field = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

function makeId() {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

const FIELD_TYPES: { value: FieldType; label: string; hasOptions: boolean }[] = [
  { value: "text", label: "Short text", hasOptions: false },
  { value: "textarea", label: "Long text", hasOptions: false },
  { value: "email", label: "Email", hasOptions: false },
  { value: "url", label: "URL", hasOptions: false },
  { value: "number", label: "Number", hasOptions: false },
  { value: "date", label: "Date", hasOptions: false },
  { value: "select", label: "Single select", hasOptions: true },
  { value: "multiselect", label: "Multi select", hasOptions: true },
];

export function QuestionnaireBuilder({
  workspaceId,
  questionnaireId,
  initial,
}: {
  workspaceId: string;
  questionnaireId?: string;
  initial?: { name: string; description: string | null; schema: Field[] };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [fields, setFields] = useState<Field[]>(initial?.schema || []);
  const [pending, startTransition] = useTransition();

  function addField() {
    setFields([...fields, {
      id: makeId(),
      type: "text",
      label: "",
      required: false,
      placeholder: "",
    }]);
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields(fields.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeField(id: string) {
    setFields(fields.filter(f => f.id !== id));
  }

  function moveField(id: string, direction: -1 | 1) {
    const idx = fields.findIndex(f => f.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const next = [...fields];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setFields(next);
  }

  function handleSave() {
    if (!name.trim()) {
      alert("Please give the questionnaire a name");
      return;
    }
    if (fields.length === 0) {
      alert("Please add at least one field");
      return;
    }
    const cleanFields = fields.map(f => ({
      id: f.id,
      type: f.type,
      label: f.label || "Untitled field",
      required: f.required,
      options: f.type === "select" || f.type === "multiselect" ? (f.options || []).filter(Boolean) : undefined,
      placeholder: f.placeholder || undefined,
    }));

    startTransition(async () => {
      try {
        const q = await createQuestionnaire({
          workspaceId,
          name: name.trim(),
          description: description.trim() || null,
          schema: cleanFields,
        });
        router.push(`/app/questionnaires/${q.id}`);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <Input
              placeholder="e.g. New client intake"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description (optional)</label>
            <Textarea
              placeholder="What this questionnaire is for, what you do with the answers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fields</h2>
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Add field
          </Button>
        </div>

        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              No fields yet. Click "Add field" to start building.
            </CardContent>
          </Card>
        ) : (
          fields.map((field, idx) => (
            <Card key={field.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => moveField(field.id, -1)}
                      disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move up"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, 1)}
                      disabled={idx === fields.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move down"
                    >▼</button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                      <Input
                        placeholder="Field label (e.g. Project goals)"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v: FieldType) => updateField(field.id, { type: v })}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        aria-label="Delete field"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Placeholder (optional)"
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      className="text-sm"
                    />

                    {(field.type === "select" || field.type === "multiselect") && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600 block">Options (one per line)</label>
                        <Textarea
                          rows={4}
                          placeholder={"Option A\nOption B\nOption C"}
                          value={(field.options || []).join("\n")}
                          onChange={(e) => updateField(field.id, {
                            options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {fields.length > 0 && (
          <Button variant="outline" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Add another field
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {questionnaireId ? "Update questionnaire" : "Create questionnaire"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/app/questionnaires">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
