"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type Field = {
  id: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "email" | "url";
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

type Response = {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: string;
  answers: unknown;
  submittedAt: Date | null;
  createdAt: Date;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
};

export function ResponseViewer({ response, fields }: { response: Response; fields: Field[] }) {
  const [open, setOpen] = useState(false);
  const isSubmitted = response.status === "submitted";
  const answers: Record<string, string | string[] | number> = (response.answers as Record<string, string | string[] | number>) || {};

  return (
    <Card>
      <CardContent className="pt-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Badge variant={isSubmitted ? "default" : "secondary"}>
              {response.status}
            </Badge>
            <div>
              <div className="text-sm font-medium">
                {response.respondentName || "Anonymous"}
                {response.clientName && response.clientName !== response.respondentName && (
                  <span className="text-slate-500 font-normal"> · {response.clientName}</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {response.respondentEmail}
                {response.projectName && ` · ${response.projectName}`}
                {" · "}
                {isSubmitted && response.submittedAt
                  ? `submitted ${new Date(response.submittedAt).toLocaleDateString()}`
                  : `created ${new Date(response.createdAt).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {open && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {fields.map(f => {
              const val = answers[f.id];
              let display: string;
              if (val === undefined || val === null || val === "") {
                display = "(no answer)";
              } else if (Array.isArray(val)) {
                display = val.join(", ");
              } else {
                display = String(val);
              }
              return (
                <div key={f.id} className="space-y-0.5">
                  <div className="text-xs font-medium text-slate-600">{f.label}</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {display === "(no answer)" ? (
                      <span className="text-slate-400 italic">{display}</span>
                    ) : f.type === "url" && display.startsWith("http") ? (
                      <a href={display} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                        {display} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      display
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
