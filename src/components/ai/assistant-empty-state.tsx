"use client";

import { useState, useEffect, type KeyboardEvent, type RefObject } from "react";
import {
  Send,
  Sparkles,
  XCircle,
  History,
  ShieldCheck,
  ChevronRight,
  Receipt,
  CheckSquare,
  TrendingUp,
  FileText,
  UserCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  assistantCategoryLabels,
  assistantQuickActions,
  localizeAssistantAction,
} from "@/lib/ai/quick-actions";
import { getAssistantCopy, type AssistantLang } from "@/lib/ai/ui-copy";

const FEATURED_PROMPTS = [
  {
    icon: Receipt,
    category: { id: "Finance", en: "Finance" },
    title: { id: "Cek Invoice Terlambat", en: "Check Overdue Invoices" },
    desc: {
      id: "Tampilkan invoice yang belum lunas dan berapa lama jatuh tempo.",
      en: "Show unpaid invoices and how long they have been past due.",
    },
    prompt: {
      id: "Tampilkan semua invoice yang terlambat pembayarannya beserta detail jatuh temponya.",
      en: "Show all overdue invoices with their due date details.",
    },
  },
  {
    icon: TrendingUp,
    category: { id: "Summary", en: "Summary" },
    title: { id: "Ringkas Performa Minggu Ini", en: "Summarize This Week" },
    desc: {
      id: "Ringkasan cash flow, invoice terbayar, dan progress tugas terbaru.",
      en: "Summary of cash flow, paid invoices, and recent task progress.",
    },
    prompt: {
      id: "Ringkas kondisi workspace minggu ini: pemasukan, pekerjaan selesai, dan yang masih terbuka.",
      en: "Summarize this week's workspace: revenue, completed work, and what remains open.",
    },
  },
  {
    icon: CheckSquare,
    category: { id: "Work", en: "Work" },
    title: { id: "Prioritas Pekerjaan Hari Ini", en: "Today's Priorities" },
    desc: {
      id: "Daftar task yang paling mendesak berdasarkan deadline.",
      en: "List of most urgent tasks based on deadlines.",
    },
    prompt: {
      id: "Apa prioritas pekerjaan hari ini berdasarkan tenggat dan status terbaru?",
      en: "What are today's work priorities based on deadlines and current status?",
    },
  },
  {
    icon: FileText,
    category: { id: "Actions", en: "Actions" },
    title: { id: "Buat Draft Invoice Baru", en: "Create New Invoice" },
    desc: {
      id: "Bantu generate invoice baru untuk klien secara interaktif.",
      en: "Help generate a new invoice for a client interactively.",
    },
    prompt: {
      id: "Bantu saya buat invoice baru. Tanyakan nama klien, item tagihan, dan nominalnya.",
      en: "Help me create a new invoice. Ask for the client name, line items, and amount.",
    },
  },
  {
    icon: UserCheck,
    category: { id: "Clients", en: "Clients" },
    title: { id: "Draft Update Progres Klien", en: "Draft Client Update" },
    desc: {
      id: "Buat email / pesan progres profesional untuk dikirim ke klien.",
      en: "Draft a professional progress update email or message for a client.",
    },
    prompt: {
      id: "Bantu buatkan pesan update progres profesional untuk klien. Tanyakan klien dan project mana yang dimaksud.",
      en: "Help draft a professional progress update for a client. Ask which client and project.",
    },
  },
  {
    icon: Clock,
    category: { id: "Timer", en: "Timer" },
    title: { id: "Mulai Timer Tugas", en: "Start Task Timer" },
    desc: {
      id: "Langsung aktifkan timer tracker untuk tugas yang sedang dikerjakan.",
      en: "Instantly start the time tracker for the active task.",
    },
    prompt: {
      id: "Mulai timer untuk pekerjaan saya sekarang.",
      en: "Start a timer for my current work.",
    },
  },
];

export function AssistantEmptyState({
  lang,
  input,
  setInput,
  send,
  busy,
  stop,
  inputRef,
  onKeyDown,
  openHistory,
}: {
  lang: AssistantLang;
  input: string;
  setInput: (v: string) => void;
  send: (v: string) => void;
  busy: boolean;
  stop: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  openHistory: () => void;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ limit: number } | null>(null);
  const copy = getAssistantCopy(lang);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/quota")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && typeof data.limit === "number") {
          setQuotaInfo({ limit: data.limit });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col px-4 py-4 md:px-8 md:py-6 space-y-6">
      {/* Header Bar */}
      <header className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              {copy.title}
              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-mono text-primary bg-primary/10 border-primary/20">
                ⚡ {quotaInfo ? `${quotaInfo.limit}/bln` : "..."}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openHistory}
          className="h-8 rounded-xl text-xs font-semibold gap-1.5 shadow-xs md:hidden"
        >
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          {copy.history}
        </Button>
      </header>

      {/* Main Greeting & Input Composer (Full Width) */}
      <main className="w-full space-y-6">
        <div className="text-center space-y-1.5 pt-2 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {copy.greeting}
          </h2>
          <p className="text-xs text-muted-foreground">
            {lang === "id"
              ? "Ketik instruksi, tanya performa operasional, buat invoice, atau kelola tugas secara instan."
              : "Ask questions, query business metrics, manage invoices, or update task statuses instantly."}
          </p>
        </div>

        {/* Input Composer Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative w-full rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
        >
          <label className="sr-only" htmlFor="assistant-empty-input">
            {copy.placeholder}
          </label>
          <textarea
            id="assistant-empty-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={copy.placeholder}
            className="max-h-32 min-h-16 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
          />
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{lang === "id" ? "Tindakan mutasi wajib konfirmasi" : "Mutations require approval"}</span>
            </div>
            <Button
              type={busy ? "button" : "submit"}
              onClick={busy ? stop : undefined}
              disabled={!busy && !input.trim()}
              className="h-9 rounded-xl bg-primary text-primary-foreground font-semibold px-4 text-xs gap-1.5 shadow-xs"
            >
              {busy ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {copy.send}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Featured Prompts Grid (3 Columns on desktop, rich prompt cards) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              {lang === "id" ? "Contoh Perintah & Prompt Cepat" : "Suggested Prompts & Actions"}
            </p>
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              {copy.allHelp} <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              const isId = lang === "id";
              const titleText = isId ? item.title.id : item.title.en;
              const descText = isId ? item.desc.id : item.desc.en;
              const promptText = isId ? item.prompt.id : item.prompt.en;
              const categoryText = isId ? item.category.id : item.category.en;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(promptText);
                    inputRef.current?.focus();
                  }}
                  className="group flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded-md">
                        {categoryText}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {titleText}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {descText}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-medium text-primary">
                    <span>{isId ? "Gunakan prompt" : "Use prompt"}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Capability Info Banner */}
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="font-bold text-foreground shrink-0">{copy.capabilityReadTitle}:</span>
            <span>{copy.capabilityRead}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-foreground shrink-0">{copy.capabilityActTitle}:</span>
            <span>{copy.capabilityAct}</span>
          </div>
        </section>
      </main>

      {/* All Actions Modal Dialog */}
      {allOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-xs sm:items-center sm:justify-center p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAllOpen(false);
          }}
        >
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 shadow-xl sm:max-w-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground">{copy.allHelp}</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAllOpen(false)}
                className="h-7 text-xs rounded-lg"
              >
                {copy.close}
              </Button>
            </div>
            {Object.entries(assistantCategoryLabels).map(([category, title]) => (
              <section key={category} className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {title[lang]}
                </h3>
                <div className="grid gap-1.5">
                  {assistantQuickActions
                    .filter((a) => a.category === category)
                    .map((a) => {
                      const v = localizeAssistantAction(a, lang);
                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            setInput(v.prompt);
                            setAllOpen(false);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-card"
                        >
                          <span className="truncate">{v.label}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
