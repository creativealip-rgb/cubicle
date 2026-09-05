"use client";

import { useState, type KeyboardEvent, type RefObject } from "react";
import {
  Send,
  Sparkles,
  XCircle,
  History,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  assistantCategoryLabels,
  assistantQuickActions,
  localizeAssistantAction,
  primaryAssistantActions,
} from "@/lib/ai/quick-actions";
import { getAssistantCopy, type AssistantLang } from "@/lib/ai/ui-copy";
import { cn } from "@/lib/utils";

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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const copy = getAssistantCopy(lang);

  const filterChips = [
    { id: "all", label: lang === "id" ? "Semua Rekomendasi" : "All Prompts" },
    { id: "finance", label: lang === "id" ? "Keuangan & Invoice" : "Finance & Invoices" },
    { id: "projects", label: lang === "id" ? "Tugas & Proyek" : "Tasks & Projects" },
    { id: "clients", label: lang === "id" ? "Klien & Portal" : "Clients & Portal" },
  ];

  function getActionCategory(id: string) {
    if (id.includes("invoice") || id.includes("business") || id.includes("financial")) return "finance";
    if (id.includes("task") || id.includes("project")) return "projects";
    if (id.includes("client")) return "clients";
    return "general";
  }

  const displayedActions = primaryAssistantActions.filter((action) => {
    if (activeCategory === "all") return true;
    return getActionCategory(action.id) === activeCategory;
  });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-4 md:py-8 space-y-6">
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
                ⚡ 1000/bln
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

      {/* Main Greeting & Input Composer */}
      <main className="w-full space-y-6">
        <div className="text-center space-y-1.5 pt-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {copy.greeting}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {lang === "id"
              ? "Ketik instruksi, tanya performa operasional, buat invoice, atau perbarui status tugas secara instan."
              : "Ask questions, query business metrics, manage invoices, or update task statuses instantly."}
          </p>
        </div>

        {/* Input Composer Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
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

        {/* Quick Suggestion Chips & Cards */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveCategory(chip.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                    activeCategory === chip.id
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              {copy.allHelp} <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {displayedActions.map((action) => {
              const { label, prompt } = localizeAssistantAction(action, lang);
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card p-3 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
                >
                  <span className="text-xs font-semibold text-foreground truncate">{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
