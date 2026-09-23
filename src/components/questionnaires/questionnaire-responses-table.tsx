"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  LayoutList,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  User,
  Eye,
  X,
  Mail,
  Folder,
} from "lucide-react";
import type { QuestionnaireField } from "@/lib/questionnaire-schema";

export type QuestionnaireResponseItem = {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  status: string;
  answers: unknown;
  submittedAt: Date | string | null;
  createdAt: Date | string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
};

export function QuestionnaireResponsesTable({
  responses,
  fields,
  formName,
}: {
  responses: QuestionnaireResponseItem[];
  fields: QuestionnaireField[];
  formName: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<QuestionnaireResponseItem | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const filteredResponses = useMemo(() => {
    if (!searchTerm.trim()) return responses;
    const term = searchTerm.toLowerCase();
    return responses.filter((r) => {
      const nameMatch = (r.respondentName || "").toLowerCase().includes(term);
      const emailMatch = (r.respondentEmail || "").toLowerCase().includes(term);
      const clientMatch = (r.clientName || "").toLowerCase().includes(term);
      const projectMatch = (r.projectName || "").toLowerCase().includes(term);
      const answersMatch = JSON.stringify(r.answers || "").toLowerCase().includes(term);
      return nameMatch || emailMatch || clientMatch || projectMatch || answersMatch;
    });
  }, [responses, searchTerm]);

  // CSV Export Function
  function handleExportCsv() {
    if (responses.length === 0) return;

    // Header columns: Metadata + Each Field Label
    const headers = [
      "Respondent Name",
      "Respondent Email",
      "Client",
      "Project",
      "Status",
      "Submitted At",
      ...fields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
    ];

    const rows = responses.map((r) => {
      const answers = (r.answers as Record<string, unknown>) || {};
      const dateStr = r.submittedAt ? new Date(r.submittedAt).toISOString() : "";
      
      const fieldValues = fields.map((f) => {
        const val = answers[f.id];
        if (val === undefined || val === null) return '""';
        if (Array.isArray(val)) return `"${val.join("; ").replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });

      return [
        `"${(r.respondentName || "").replace(/"/g, '""')}"`,
        `"${(r.respondentEmail || "").replace(/"/g, '""')}"`,
        `"${(r.clientName || "").replace(/"/g, '""')}"`,
        `"${(r.projectName || "").replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${dateStr}"`,
        ...fieldValues,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${formName.toLowerCase().replace(/\s+/g, "-")}-responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-background p-3 rounded-xl border border-border/80 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari respon (nama, email, isi jawaban)..."
            className="h-8.5 pl-8 text-xs bg-muted/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View (Spreadsheet)"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card View"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export CSV Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={responses.length === 0}
            className="h-8.5 gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Response Display Mode */}
      {filteredResponses.length === 0 ? (
        <Card className="rounded-xl border border-dashed">
          <CardContent className="py-12 text-center text-xs text-muted-foreground">
            {searchTerm ? "Tidak ada respon yang cocok dengan pencarian." : "Belum ada respon masuk untuk formulir ini."}
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* ─── Jotform Tables: Dense Spreadsheet View ─── */
        <div className="rounded-xl border border-border/80 bg-background overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] text-[11px] font-bold uppercase tracking-wider py-2.5">
                    Responden
                  </TableHead>
                  <TableHead className="w-[100px] text-[11px] font-bold uppercase tracking-wider py-2.5">
                    Status
                  </TableHead>
                  {fields.map((f) => (
                    <TableHead key={f.id} className="min-w-[160px] max-w-[240px] text-[11px] font-bold uppercase tracking-wider py-2.5 truncate">
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-[11px] font-bold uppercase tracking-wider py-2.5 text-right">
                    Waktu Submit
                  </TableHead>
                  <TableHead className="w-[50px] py-2.5 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((r) => {
                  const answers = (r.answers as Record<string, unknown>) || {};
                  const isSubmitted = r.status === "submitted";

                  return (
                    <TableRow
                      key={r.id}
                      onClick={() => setSelectedResponse(r)}
                      className="cursor-pointer hover:bg-muted/30 transition-colors group text-xs"
                    >
                      {/* Respondent Info */}
                      <TableCell className="py-3 font-medium">
                        <div className="flex flex-col">
                          <span className="text-foreground font-semibold truncate">
                            {r.respondentName || r.clientName || "Responden Anonim"}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {r.respondentEmail || "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="py-3">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </TableCell>

                      {/* Dynamic Fields Data Columns */}
                      {fields.map((f) => {
                        const val = answers[f.id];
                        let text = "-";
                        if (val !== undefined && val !== null && val !== "") {
                          text = Array.isArray(val) ? val.join(", ") : String(val);
                        }

                        return (
                          <TableCell key={f.id} className="py-3 max-w-[240px] truncate text-muted-foreground">
                            {f.type === "url" && text.startsWith("http") ? (
                              <a
                                href={text}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <span className="truncate">{text}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span>{text}</span>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* Date */}
                      <TableCell className="py-3 text-[11px] text-muted-foreground text-right whitespace-nowrap">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </TableCell>

                      {/* View Detail Action */}
                      <TableCell className="py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponse(r);
                          }}
                          className="h-7 w-7 rounded-md text-muted-foreground group-hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ─── Card List View ─── */
        <div className="space-y-3">
          {filteredResponses.map((r) => {
            const answers = (r.answers as Record<string, unknown>) || {};
            const isSubmitted = r.status === "submitted";

            return (
              <Card
                key={r.id}
                onClick={() => setSelectedResponse(r)}
                className="rounded-xl border border-border/80 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {(r.respondentName || r.clientName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">
                          {r.respondentName || r.clientName || "Responden Anonim"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">{r.respondentEmail || "-"}</p>
                      </div>
                    </div>
                    {isSubmitted ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                    {fields.slice(0, 3).map((f) => (
                      <div key={f.id} className="min-w-0">
                        <span className="text-[10px] text-muted-foreground block truncate">{f.label}</span>
                        <span className="font-medium text-foreground truncate block">
                          {answers[f.id] ? String(answers[f.id]) : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Detail Side Drawer / Modal ─── */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-0">
          <div className="w-full max-w-lg bg-background h-full shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Detail Respon Formulir</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedResponse(null)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Respondent Card */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Data Responden
                  </span>
                  <Badge variant={selectedResponse.status === "submitted" ? "default" : "secondary"}>
                    {selectedResponse.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    {selectedResponse.respondentName || selectedResponse.clientName || "Responden Anonim"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedResponse.respondentEmail || "-"}
                  </p>
                  {selectedResponse.projectName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5" />
                      Proyek: {selectedResponse.projectName}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Waktu Submit:{" "}
                    {selectedResponse.submittedAt
                      ? new Date(selectedResponse.submittedAt).toLocaleString("id-ID")
                      : new Date(selectedResponse.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Answers Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Daftar Pertanyaan & Jawaban
                </h4>
                <div className="space-y-3">
                  {fields.map((f, i) => {
                    const answers = (selectedResponse.answers as Record<string, unknown>) || {};
                    const val = answers[f.id];
                    let display = "-";
                    if (val !== undefined && val !== null && val !== "") {
                      display = Array.isArray(val) ? val.join(", ") : String(val);
                    }

                    return (
                      <div key={f.id} className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-foreground">
                            {i + 1}. {f.label}
                          </label>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                            {f.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap break-words">
                          {f.type === "url" && display.startsWith("http") ? (
                            <a
                              href={display}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
