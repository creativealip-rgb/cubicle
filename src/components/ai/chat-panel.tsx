"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  AlertCircle,
  Check,
  XCircle,
  MessageSquarePlus,
  History,
  Trash2,
  Mic,
  MicOff,
  Clock,
  Plus,
  Settings2,
  MessageSquare,
  Users,
  FolderKanban,
  CheckSquare,
  Receipt,
  FileText,
  Calendar,
  TrendingUp,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stripThinking } from "@/lib/ai/strip";

type Role = "user" | "assistant" | "tool";

type Confirmation =
  | {
      kind: "update_task_status";
      taskId: string;
      taskTitle: string;
      currentStatus: string;
      newStatus: string;
      reason: string | null;
    }
  | {
      kind: "draft_invoice_reminder";
      invoiceId: string;
      invoiceNumber: string;
      to: string | null;
      subject: string;
      body: string;
    };

type Message = {
  role: Role;
  content: string;
  pending?: boolean;
  error?: string;
  meta?: string;
  confirmation?: Confirmation;
  confirmationStatus?: "pending" | "done" | "failed";
  status?: string; // "Thinking…" / "Running list_clients…" / undefined
  toolEvents?: Array<{ name: string; result: unknown }>;
};

type Conv = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SUGGESTIONS = [
  "How's the business?",
  "Any overdue invoices?",
  "What's pending for Kopi Senja?",
  "List active clients",
  "Show me open tasks",
  "Mark the overdue task as done",
  "Draft a reminder for INV-0001",
];

// Full-page welcome — bigger, more specific (matches AI workspace hub feel)
const SUGGESTED_CARDS = [
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Summarize this week",
    desc: "Revenue, deliverables, what's still open",
    prompt: "Summarize this week — revenue, deliverables, what's still open.",
  },
  {
    icon: <Receipt className="h-4 w-4" />,
    title: "Review overdue invoices",
    desc: "List unpaid invoices and how long they're past due",
    prompt: "List all overdue invoices and how long they've been past due.",
  },
  {
    icon: <FileQuestion className="h-4 w-4" />,
    title: "Draft a client update",
    desc: "Generate a status update I can send to a client",
    prompt: "Draft a client status update I can send. Ask me which client.",
  },
];

// App integration bar — Cubiqlo-native modules
const MODULE_ICONS = [
  { icon: <Users className="h-3.5 w-3.5" />, label: "Clients" },
  { icon: <FolderKanban className="h-3.5 w-3.5" />, label: "Projects" },
  { icon: <CheckSquare className="h-3.5 w-3.5" />, label: "Tasks" },
  { icon: <Receipt className="h-3.5 w-3.5" />, label: "Invoices" },
  { icon: <Clock className="h-3.5 w-3.5" />, label: "Time" },
  { icon: <FileText className="h-3.5 w-3.5" />, label: "Files" },
  { icon: <Calendar className="h-3.5 w-3.5" />, label: "Calendar" },
];

export function AIChatPanel({ variant = "floating" }: { variant?: "floating" | "fullpage" } = {}) {
  const isFullpage = variant === "fullpage";
  const [open, setOpen] = useState(isFullpage);
  useEffect(() => {
    if (isFullpage) setOpen(true);
  }, [isFullpage]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [showHistoryBelow, setShowHistoryBelow] = useState(true);
  const [lastUsage, setLastUsage] = useState<{
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (isFullpage) return;
    if (typeof window === "undefined") return;
    const handler = () => setOpen((v) => !v);
    window.addEventListener("cubicle:toggle-ai", handler);
    return () => window.removeEventListener("cubicle:toggle-ai", handler);
  }, [isFullpage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    setShowHistoryBelow(messages.length === 0);
  }, [messages.length]);

  useEffect(() => {
    if (open) loadConversations();
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) return;
    setVoiceSupported(true);
    const Ctor = SR as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void;
      onerror: (ev: { error: string }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      if (text) setInput((prev) => (prev ? prev + " " + text : text));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  async function loadConversations() {
    try {
      const r = await fetch("/api/ai/conversations");
      if (!r.ok) return;
      const data = await r.json();
      setConversations(data.conversations ?? []);
    } catch {
      /* ignore */
    }
  }

  async function loadConversation(id: string) {
    setConversationId(id);
    setShowHistoryBelow(false);
    try {
      const r = await fetch(`/api/ai/conversations?id=${id}`);
      if (!r.ok) return;
      const data = await r.json();
      const loaded: Message[] = (data.messages ?? []).map(
        (m: {
          role: Role;
          content: string;
          toolName: string | null;
        }) => ({
          role: m.role === "tool" ? "assistant" : m.role,
          content: m.content,
          meta: m.toolName ?? undefined,
        }),
      );
      setMessages(loaded);
    } catch {
      /* ignore */
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setShowHistoryBelow(true);
  }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/ai/conversations?id=${id}`, { method: "DELETE" });
      if (conversationId === id) startNewChat();
      loadConversations();
    } catch {
      /* ignore */
    }
  }

  function stopStream() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function toggleVoice() {
    if (!recognitionRef.current) return;
    const r = recognitionRef.current as {
      start: () => void;
      stop: () => void;
    };
    if (listening) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    } else {
      try {
        r.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        pending: true,
        status: "Thinking…",
        toolEvents: [],
      },
    ]);
    setLastUsage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let res: Response;
    try {
      res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: trimmed }].map(
            (m) => ({ role: m.role, content: m.content }),
          ),
          conversationId: conversationId ?? undefined,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "",
          error: err instanceof Error ? err.message : "Network error",
        };
        return copy;
      });
      setBusy(false);
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "",
          error: text || `HTTP ${res.status}`,
        };
        return copy;
      });
      setBusy(false);
      return;
    }
    if (!res.body) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "",
          error: "No response body",
        };
        return copy;
      });
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    type SseEvent = { event: string; data: string };
    const parseSseBlock = (block: string): SseEvent | null => {
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length === 0 && eventName === "message") return null;
      return { event: eventName, data: dataLines.join("\n") };
    };

    const updateTail = (patch: Partial<Message>) => {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (!last || last.role !== "assistant") return prev;
        copy[copy.length - 1] = { ...last, ...patch };
        return copy;
      });
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const ev = parseSseBlock(block);
          if (!ev) continue;
          let payload: Record<string, unknown> = {};
          try {
            payload = ev.data ? JSON.parse(ev.data) : {};
          } catch {
            continue;
          }

          switch (ev.event) {
            case "status": {
              const label = String(payload.label ?? "");
              updateTail({ status: label || undefined });
              break;
            }
            case "content": {
              const delta = String(payload.delta ?? "");
              if (!delta) break;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== "assistant") return prev;
                const stripped = stripThinking(delta);
                if (!stripped) return prev;
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + stripped,
                  status: undefined,
                };
                return copy;
              });
              break;
            }
            case "tool": {
              const name = String(payload.name ?? "tool");
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== "assistant") return prev;
                copy[copy.length - 1] = {
                  ...last,
                  toolEvents: [
                    ...(last.toolEvents ?? []),
                    { name, result: payload.result },
                  ],
                  status: undefined,
                };
                return copy;
              });
              break;
            }
            case "confirm": {
              const confirmation = payload.confirmation as Confirmation;
              updateTail({
                pending: false,
                status: undefined,
                confirmation,
                confirmationStatus: "pending",
              });
              break;
            }
            case "done": {
              loadConversations();
              const toolCalls = Number(payload.toolCalls ?? 0);
              const usage = payload.usage as
                | { prompt_tokens: number; completion_tokens: number; total_tokens: number }
                | undefined;
              if (usage) setLastUsage(usage);
              updateTail({
                pending: false,
                status: undefined,
                meta: toolCalls
                  ? `${toolCalls} tool call${toolCalls === 1 ? "" : "s"}`
                  : "direct",
              });
              break;
            }
            case "error": {
              updateTail({
                pending: false,
                status: undefined,
                error: String(payload.message ?? "Stream error"),
              });
              break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        updateTail({
          pending: false,
          status: undefined,
          error: "Stopped by user",
        });
        return;
      }
      updateTail({
        pending: false,
        status: undefined,
        error: err instanceof Error ? err.message : "Stream error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction(idx: number) {
    const msg = messages[idx];
    if (!msg?.confirmation) return;

    setMessages((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], confirmationStatus: "pending" };
      return copy;
    });

    try {
      const r = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: msg.confirmation.kind,
          payload: msg.confirmation,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            confirmationStatus: "failed",
            error: data.error || `HTTP ${r.status}`,
          };
          return copy;
        });
        return;
      }
      setMessages((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], confirmationStatus: "done" };
        return copy;
      });
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          confirmationStatus: "failed",
          error: err instanceof Error ? err.message : "Network error",
        };
        return copy;
      });
    }
  }

  function dismissAction(idx: number) {
    setMessages((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], confirmationStatus: "done" };
      return copy;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {open && (
        <div
          className={cn(
            isFullpage
              ? "flex h-full w-full max-w-4xl mx-auto flex-col"
              : "fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl",
            isFullpage
              ? ""
              : "h-[min(640px,85vh)] w-[min(420px,calc(100vw-2rem))] md:bottom-20 md:right-6",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Full-page welcome (empty state, big screen) — AI workspace hub feel */}
            {isFullpage && messages.length === 0 ? (
              <WelcomeScreen
                input={input}
                setInput={setInput}
                send={send}
                onKeyDown={onKeyDown}
                busy={busy}
                stopStream={stopStream}
                listening={listening}
                voiceSupported={voiceSupported}
                toggleVoice={toggleVoice}
                inputRef={inputRef}
                conversations={conversations}
                conversationId={conversationId}
                loadConversation={loadConversation}
                deleteConversation={deleteConversation}
              />
            ) : (
              <>{/* Header */}
                  {isFullpage ? (
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cu-purple)] to-[var(--cu-purple-hover)] text-white">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Cubiqlo AI</p>
                          <p className="text-[11px] text-slate-400">gemini-3-flash · workspace assistant</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={startNewChat}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="New chat"
                          title="New chat"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            New chat
                          </span>
                        </button>
                        {messages.length > 0 && (
                          <button
                            onClick={() => setShowHistoryBelow((v) => !v)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                              showHistoryBelow
                                ? "bg-purple-50 text-[var(--cu-purple)]"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                            )}
                            aria-label="Toggle history"
                            title="History"
                          >
                            <span className="flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5" />
                              History
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-[var(--cu-purple)] to-[var(--cu-purple-hover)] px-4 py-3 text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-semibold leading-none">Cubiqlo AI</p>
                          <p className="text-[10px] text-purple-100">
                            Workspace assistant · gemini-3-flash
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={startNewChat}
                          className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
                          aria-label="New chat"
                          title="New chat"
                        >
                          <MessageSquarePlus className="h-4 w-4" />
                        </button>
                        {messages.length > 0 && (
                          <button
                            onClick={() => setShowHistoryBelow((v) => !v)}
                            className={cn(
                              "rounded-md p-1 hover:bg-white/10",
                              showHistoryBelow ? "bg-white/15 text-white" : "text-white/80 hover:text-white",
                            )}
                            aria-label="Toggle history"
                            title="History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setOpen(false)}
                          className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className={cn(
                    "flex-1 space-y-4 overflow-y-auto",
                    isFullpage
                      ? "bg-white px-6 py-6"
                      : "space-y-3 bg-slate-50 px-3 py-4",
                  )}
                >
                  {messages.length === 0 && !isFullpage && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                        Hi! I can look up clients, projects, tasks, and invoices.
                        I can also mark tasks done or draft invoice reminders.
                        Try one of these:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[var(--cu-purple)] hover:bg-purple-50 hover:text-[var(--cu-purple)]"
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
                          "rounded-2xl px-4 py-3 text-sm shadow-sm",
                          isFullpage ? "max-w-[75%]" : "max-w-[85%]",
                          m.role === "user"
                            ? "bg-[var(--cu-purple)] text-white"
                            : isFullpage
                              ? "bg-slate-50 text-slate-900 ring-1 ring-slate-100"
                              : "bg-white text-slate-900 ring-1 ring-slate-200",
                          m.error && "bg-red-50 ring-red-200 text-red-900",
                        )}
                      >
                        {m.pending ? (
                          <div className="flex flex-col gap-1.5 text-slate-500">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>{m.status || "Thinking…"}</span>
                            </div>
                            {m.content && (
                              <div className="text-slate-900">
                                {m.content}
                                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-slate-400 align-middle" />
                              </div>
                            )}
                            {m.toolEvents && m.toolEvents.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {m.toolEvents.map((te, j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {te.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : m.error ? (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">{m.error}</span>
                          </div>
                        ) : (
                          <>
                            {m.toolEvents && m.toolEvents.length > 0 && (
                              <div className="mb-1.5 flex flex-wrap gap-1">
                                {m.toolEvents.map((te, j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {te.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {m.content && (
                              <div className="whitespace-pre-wrap break-words">
                                {m.content}
                              </div>
                            )}
                            {!m.content && m.confirmation && (
                              <p className="text-xs text-slate-600">
                                I have a proposal — please confirm below.
                              </p>
                            )}
                          </>
                        )}

                        {m.confirmation && m.confirmationStatus === "pending" && (
                          <ConfirmationCard
                            conf={m.confirmation}
                            onConfirm={() => confirmAction(i)}
                            onDismiss={() => dismissAction(i)}
                          />
                        )}
                        {m.confirmation && m.confirmationStatus === "done" && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                            <Check className="h-3 w-3" />
                            <span>Done</span>
                          </div>
                        )}
                        {m.confirmation && m.confirmationStatus === "failed" && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-red-700">
                            <XCircle className="h-3 w-3" />
                            <span>Action failed</span>
                          </div>
                        )}

                        {m.meta && !m.error && !m.pending && !m.confirmation && (
                          <div className="mt-1 text-[10px] text-slate-400">
                            {m.meta}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input — always visible above history */}
                <div className={cn("border-t", isFullpage ? "border-slate-200 bg-white px-6 py-4" : "bg-white p-2")}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(input);
                    }}
                    className={cn("flex items-end gap-2", isFullpage && "max-w-4xl")}
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
                        "flex-1 resize-none border px-3 py-2.5 text-sm",
                        "focus:outline-none focus:ring-1",
                        "max-h-24 disabled:opacity-50",
                        isFullpage
                          ? "rounded-xl border-slate-200 bg-white focus:border-[var(--cu-purple)] focus:ring-[var(--cu-purple)]"
                          : "rounded-lg border-slate-200 bg-slate-50 focus:border-[var(--cu-purple)] focus:ring-[var(--cu-purple)]",
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={toggleVoice}
                      disabled={!voiceSupported}
                      className={cn(
                        "h-9 w-9 shrink-0",
                        listening && "bg-red-50 text-red-600 hover:bg-red-100",
                      )}
                      aria-label={listening ? "Stop listening" : "Voice input"}
                      title={
                        !voiceSupported
                          ? "Voice input not supported in this browser"
                          : listening
                            ? "Stop listening"
                            : "Voice input"
                      }
                    >
                      {listening ? (
                        <MicOff className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type={busy ? "button" : "submit"}
                      size="icon"
                      disabled={!busy && !input.trim()}
                      onClick={busy ? stopStream : undefined}
                      className={cn(
                        "h-10 w-10 shrink-0",
                        isFullpage && "rounded-xl",
                        busy
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-[var(--cu-purple)] hover:bg-[var(--cu-purple-hover)] text-white",
                      )}
                      aria-label={busy ? "Stop" : "Send"}
                      title={busy ? "Stop" : "Send"}
                    >
                      {busy ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                  <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-slate-400">
                    <span>Press Enter to send · Shift+Enter for newline</span>
                    {lastUsage && (
                      <span title={`prompt: ${lastUsage.prompt_tokens} · completion: ${lastUsage.completion_tokens}`}>
                        {lastUsage.total_tokens.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                </div>

                {/* History list */}
                {showHistoryBelow && (
                  <div className={cn("border-t", isFullpage ? "border-slate-200 bg-white" : "bg-slate-50/50")}>
                    <div className={cn("flex items-center justify-between pt-3 pb-1", isFullpage ? "px-6" : "px-4")}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Clock className="h-3 w-3" />
                        Recent
                      </div>
                      {messages.length > 0 && (
                        <button
                          onClick={() => setShowHistoryBelow(false)}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          aria-label="Hide history"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className={cn("max-h-44 overflow-y-auto pb-2", isFullpage ? "px-4" : "px-2")}>
                      {conversations.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-slate-400">
                          No chats yet. Start one above.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {conversations.map((c) => (
                            <li
                              key={c.id}
                              className={cn(
                                "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs",
                                c.id === conversationId
                                  ? "bg-purple-100 text-[var(--cu-purple)]"
                                  : "text-slate-700 hover:bg-white",
                              )}
                            >
                              <button
                                onClick={() => loadConversation(c.id)}
                                className="flex min-w-0 flex-1 flex-col items-start text-left"
                              >
                                <span className="w-full truncate font-medium">
                                  {c.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatRelativeTime(c.updatedAt)}
                                </span>
                              </button>
                              <button
                                onClick={() => deleteConversation(c.id)}
                                className="shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                aria-label="Delete conversation"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Full-page welcome screen — ChatGPT/Notion AI-style hub layout
// ────────────────────────────────────────────────────────────────────────────
function WelcomeScreen({
  input,
  setInput,
  send,
  onKeyDown,
  busy,
  stopStream,
  listening,
  voiceSupported,
  toggleVoice,
  inputRef,
  conversations,
  conversationId,
  loadConversation,
  deleteConversation,
}: {
  input: string;
  setInput: (v: string) => void;
  send: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  busy: boolean;
  stopStream: () => void;
  listening: boolean;
  voiceSupported: boolean;
  toggleVoice: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  conversations: Conv[];
  conversationId: string | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}) {
  return (
    <div className="bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 pt-10 pb-6 md:pt-16">
        {/* Logo + Greeting */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cu-purple)] to-[var(--cu-purple-hover)] text-white shadow-lg">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            How can I help with your client work today?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Ask about clients, projects, tasks, invoices — or anything in your workspace data.
          </p>
        </div>

        {/* Input — large rounded box, purple focus */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-8"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-[var(--cu-purple)] focus-within:shadow-md focus-within:ring-2 focus-within:ring-[var(--cu-purple)]/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything about your client work…"
              rows={1}
              disabled={busy}
              className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm focus:outline-none max-h-32 disabled:opacity-50"
            />
            <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Add context"
                  title="Add context"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Auto
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleVoice}
                  disabled={!voiceSupported}
                  className={cn(
                    "h-8 w-8",
                    listening && "bg-red-50 text-red-600 hover:bg-red-100",
                  )}
                  aria-label={listening ? "Stop listening" : "Voice input"}
                  title={
                    !voiceSupported
                      ? "Voice input not supported in this browser"
                      : listening
                        ? "Stop listening"
                        : "Voice input"
                  }
                >
                  {listening ? (
                    <MicOff className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type={busy ? "button" : "submit"}
                  size="icon"
                  disabled={!busy && !input.trim()}
                  onClick={busy ? stopStream : undefined}
                  className={cn(
                    "h-8 w-8 bg-[var(--cu-purple)] hover:bg-[var(--cu-purple-hover)] text-white",
                    busy && "bg-red-500 hover:bg-red-600",
                  )}
                  aria-label={busy ? "Stop" : "Send"}
                  title={busy ? "Stop" : "Send"}
                >
                  {busy ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* App integration bar */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
          <span className="font-medium text-slate-500">Works with your Cubiqlo data</span>
          <div className="flex items-center gap-1">
            {MODULE_ICONS.map((m) => (
              <span
                key={m.label}
                title={m.label}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-600 ring-1 ring-slate-200/70"
              >
                {m.icon}
              </span>
            ))}
          </div>
        </div>

        {/* 2-col: Recent + Suggested */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recent */}
          <div>
            <div className="flex items-center justify-between px-1 pb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Recent
              </h3>
              {conversations.length > 0 && (
                <span className="text-[10px] text-slate-400">
                  {conversations.length} total
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {conversations.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
                  No chats yet. Start one above.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {conversations.slice(0, 5).map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 text-xs transition",
                        c.id === conversationId
                          ? "bg-purple-50/60"
                          : "hover:bg-slate-50",
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <button
                        onClick={() => loadConversation(c.id)}
                        className="flex-1 truncate text-left font-medium text-slate-700 hover:text-[var(--cu-purple)]"
                      >
                        {c.title}
                      </button>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatRelativeTime(c.updatedAt)}
                      </span>
                      <button
                        onClick={() => deleteConversation(c.id)}
                        className="shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        aria-label="Delete conversation"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Suggested */}
          <div>
            <div className="flex items-center justify-between px-1 pb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Suggested
              </h3>
            </div>
            <div className="space-y-2">
              {SUGGESTED_CARDS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => send(s.prompt)}
                  className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[var(--cu-purple)] hover:shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-[var(--cu-purple)]/10 group-hover:text-[var(--cu-purple)]">
                      {s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-center text-[10px] text-slate-400">
          Press Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

function ConfirmationCard({
  conf,
  onConfirm,
  onDismiss,
}: {
  conf: Confirmation;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  if (conf.kind === "update_task_status") {
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">Confirm action</p>
        <p className="mt-1">
          Change task <b>{conf.taskTitle}</b> from{" "}
          <span className="rounded bg-amber-200 px-1.5 py-0.5">
            {conf.currentStatus}
          </span>{" "}
          to{" "}
          <span className="rounded bg-amber-200 px-1.5 py-0.5">
            {conf.newStatus}
          </span>
        </p>
        {conf.reason && (
          <p className="mt-1 text-amber-800">Reason: {conf.reason}</p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            onClick={onConfirm}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Confirm
          </button>
          <button
            onClick={onDismiss}
            className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">Confirm action — send payment reminder</p>
      <p className="mt-1">
        To: <b>{conf.to ?? "(no email on client)"}</b>
      </p>
      <p className="mt-1">
        Subject: <b>{conf.subject}</b>
      </p>
      <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-white p-2 text-[11px] text-slate-800 ring-1 ring-amber-200">
        {conf.body}
      </pre>
      <div className="mt-2 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={!conf.to}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Send email
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
