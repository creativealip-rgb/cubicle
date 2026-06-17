"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitQuestionnaire } from "@/lib/actions/questionnaires";
import { Loader2, CheckCircle2 } from "lucide-react";

type Field = {
  id: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "email" | "url";
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export function IntakeForm({ token, fields }: { token: string; fields: Field[] }) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setVal(id: string, val: string | string[] | number) {
    setAnswers(prev => ({ ...prev, [id]: val }));
  }

  function handleMultiSelect(id: string, option: string, checked: boolean) {
    setAnswers(prev => {
      const cur = (prev[id] as string[]) || [];
      const next = checked ? [...cur, option] : cur.filter(c => c !== option);
      return { ...prev, [id]: next };
    });
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side required check
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          setError(`Please fill in: ${f.label}`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await submitQuestionnaire({ token, answers });
        setSubmitted(true);
      } catch (err: any) {
        setError(err?.message || "Submit failed");
      }
    });
  }

  if (submitted) {
    return (
      <div className="py-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
        <h2 className="text-xl font-semibold">Thank you!</h2>
        <p className="text-sm text-slate-500">Your responses have been received. We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map(f => (
        <div key={f.id} className="space-y-1.5">
          <label className="text-sm font-medium block">
            {f.label}
            {f.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>

          {f.type === "text" && (
            <Input
              type="text"
              placeholder={f.placeholder}
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            />
          )}

          {f.type === "textarea" && (
            <Textarea
              rows={5}
              placeholder={f.placeholder}
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            />
          )}

          {f.type === "email" && (
            <Input
              type="email"
              placeholder={f.placeholder || "you@company.com"}
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            />
          )}

          {f.type === "url" && (
            <Input
              type="url"
              placeholder={f.placeholder || "https://..."}
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            />
          )}

          {f.type === "number" && (
            <Input
              type="number"
              placeholder={f.placeholder}
              value={(answers[f.id] as number | string) ?? ""}
              onChange={(e) => setVal(f.id, e.target.value === "" ? "" : Number(e.target.value))}
            />
          )}

          {f.type === "date" && (
            <Input
              type="date"
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            />
          )}

          {f.type === "select" && (
            <select
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={(answers[f.id] as string) || ""}
              onChange={(e) => setVal(f.id, e.target.value)}
            >
              <option value="">Select an option...</option>
              {(f.options || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {f.type === "multiselect" && (
            <div className="space-y-2 border rounded-md p-3 bg-slate-50">
              {(f.options || []).map(opt => {
                const cur = (answers[f.id] as string[]) || [];
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={cur.includes(opt)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMultiSelect(f.id, opt, e.target.checked)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
        Submit responses
      </Button>
    </form>
  );
}
