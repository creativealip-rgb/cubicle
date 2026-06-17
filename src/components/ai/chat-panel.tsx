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

const SUGGESTIONS = [
  "How's the business?",
  "Any overdue invoices?",
  "What's pending for Kopi Senja?",
  "List active clients",
  "Show me open tasks",
  "Mark the overdue task as done",
  "Draft a reminder for INV-0001",
];

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Autofocus
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // Load conversation list when opened
  useEffect(() => {
    if (open) loadConversations();
  }, [open]);

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
    setShowHistory(false);
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
    setShowHistory(false);
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
      setBusy(false);
      return;
    }

    if (!res.ok) {
      // Non-streaming error (auth, 503, etc.)
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

    // ── Consume SSE stream ──
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    type SseEvent = { event: string; data: string };
    const parseSseBlock = (block: string): SseEvent | null => {
      // Each SSE event: lines of `event: <name>` and `data: <json>`, separated by \n\n
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

    // We track the assistant message in flight at the tail. When SSE arrives
    // we mutate it in place. The Message type is shared with React state, so
    // we re-set on each event to trigger re-render (cheap, message list is small).
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
            // ignore malformed event
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
              // We need to read the current content from state — use a callback
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== "assistant") return prev;
                const stripped = stripThinking(delta);
                if (!stripped) return prev;
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + stripped,
                  status: undefined, // first token: clear "Thinking…"
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
              // Optional: loadConversations if we got a new convId from header
              // (we don't have access to it here — we rely on the API to set
              // it in the response, but since we streamed, we can pull it
              // from `?cid` if exposed. For now, fetch history list anyway.)
              loadConversations();
              const toolCalls = Number(payload.toolCalls ?? 0);
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

    // Mark as executing
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
      copy[idx] = { ...copy[idx], confirmationStatus: "done" }; // hide card
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
            "fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-2xl border bg-white shadow-2xl",
            showHistory
              ? "h-[min(560px,80vh)] w-[min(680px,calc(100vw-2rem))]"
              : "h-[min(560px,80vh)] w-[min(380px,calc(100vw-2rem))]",
            "md:bottom-6 md:right-6",
          )}
        >
          {/* History sidebar */}
          {showHistory && (
            <div className="flex w-64 flex-col border-r bg-slate-50">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">
                  History
                </span>
                <button
                  onClick={startNewChat}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  aria-label="New chat"
                  title="New chat"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">
                    No chats yet
                  </p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs",
                        c.id === conversationId
                          ? "bg-blue-100 text-blue-900"
                          : "text-slate-700 hover:bg-slate-200",
                      )}
                    >
                      <button
                        onClick={() => loadConversation(c.id)}
                        className="flex-1 truncate text-left"
                      >
                        {c.title}
                      </button>
                      <button
                        onClick={() => deleteConversation(c.id)}
                        className="opacity-0 group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Main chat area */}
          <div className="flex flex-1 flex-col">
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Toggle history"
                  title="History"
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4"
            >
              {messages.length === 0 && (
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
                      <div className="flex flex-col gap-1.5 text-slate-500">
                        {/* Status line — replaces the static "Thinking…" */}
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>{m.status || "Thinking…"}</span>
                        </div>
                        {/* Live-streamed content + caret */}
                        {m.content && (
                          <div className="text-slate-900">
                            {m.content}
                            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-slate-400 align-middle" />
                          </div>
                        )}
                        {/* Tool chips — only show tools that finished while pending */}
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
                        {/* Tool chips — show what the assistant queried */}
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
                        {/* Action proposals get a small lead-in even when content is empty */}
                        {!m.content && m.confirmation && (
                          <p className="text-xs text-slate-600">
                            I have a proposal — please confirm below.
                          </p>
                        )}
                      </>
                    )}

                    {/* Confirmation card */}
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
        </div>
      )}
    </>
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
  // draft_invoice_reminder
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
