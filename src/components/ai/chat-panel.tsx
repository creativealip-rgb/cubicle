"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stripThinking } from "@/lib/ai/strip";

type Message = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: string;
  meta?: string;
};

const SUGGESTIONS = [
  "How's the business?",
  "Any overdue invoices?",
  "What's pending for Kopi Senja?",
  "List active clients",
  "Show me open tasks",
];

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Autofocus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setBusy(true);
    // placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", pending: true },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: trimmed }].map(
            (m) => ({ role: m.role, content: m.content }),
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "",
            error: data.error || `HTTP ${res.status}`,
          };
          return copy;
        });
        return;
      }
      const meta = data.toolCalls
        ? `${data.toolCalls} tool call${data.toolCalls === 1 ? "" : "s"}`
        : "direct";
      // UI defense in depth: strip any leaked reasoning tags
      const cleanContent = stripThinking(data.message?.content ?? "");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: cleanContent || "(no content)",
          meta,
        };
        return copy;
      });
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "",
          error: err instanceof Error ? err.message : "Network error",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all md:bottom-6 md:right-6",
          "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105",
          open && "scale-90 opacity-0 pointer-events-none",
        )}
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl",
            "h-[min(560px,80vh)] w-[min(380px,calc(100vw-2rem))]",
            "md:bottom-6 md:right-6",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold leading-none">Cubicle AI</p>
                <p className="text-[10px] text-blue-100">
                  Workspace assistant · tr/MiniMax-M3
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                  Hi! I can look up clients, projects, tasks, and invoices. Try
                  one of these:
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-900 ring-1 ring-slate-200",
                    m.error && "bg-red-50 ring-red-200 text-red-900",
                  )}
                >
                  {m.pending ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  ) : m.error ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">{m.error}</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {m.content || (
                        <span className="text-slate-400">(empty)</span>
                      )}
                    </div>
                  )}
                  {m.meta && !m.error && !m.pending && (
                    <div className="mt-1 text-[10px] text-slate-400">
                      {m.meta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t bg-white p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about clients, projects, tasks, invoices…"
                rows={1}
                disabled={busy}
                className={cn(
                  "flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm",
                  "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                  "max-h-24 disabled:opacity-50",
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                className="h-9 w-9 shrink-0"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="px-1 pt-1 text-[10px] text-slate-400">
              Press Enter to send · Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  );
}
