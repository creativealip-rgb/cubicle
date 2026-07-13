import { getWorkspaceForCurrentUser } from "@/lib/workspace";
/**
 * AI assistant chat endpoint (Sprint F.2 — streaming).
 *
 * POST /api/ai/chat
 * Body: { messages: ChatMessage[], conversationId?: string }
 *
 * Returns: Server-Sent Events (text/event-stream) so the UI can render
 * tokens as they stream from 9router.
 *
 *   event: status   { phase: "thinking" | "tool", label: string }
 *   event: content  { delta: string }       // text deltas (batched ~60ms)
 *   event: tool     { name, args, result }  // a tool was executed
 *   event: confirm  { tool, confirmation }  // action tool — pause for user
 *   event: error    { message: string }
 *   event: done     { conversationId, usage, toolCalls }
 *
 * Persistence: only on `done` (or `confirm` for action tools). Partial
 * streamed tokens are NOT persisted — final answer is saved as a single
 * assistant row. Tool messages are also persisted on done.
 *
 * No streaming yet (Sprint F.1). Streaming lands in F.2.
 *
 * Action tools (update_task_status, draft_invoice_reminder) return a
 * `confirmation` object — UI shows a confirm card and POSTs to /api/ai/action.
 */

import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { streamChat, type ChatMessage, aiConfig } from "@/lib/ai/client";
import { TOOL_DEFS, executeTool, ACTION_TOOLS } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import {
  appendMessage,
  getOrCreateConv,
  maybeAutoTitle,
} from "@/lib/ai/conv-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY = 20;

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
}

// ── SSE helpers ─────────────────────────────────────────────────────
// Use a ReadableStream<Uint8Array> to send Server-Sent Events.
// Each `send()` writes `event: <name>\ndata: <json>\n\n` and flushes.

function createSSEStream() {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    cancel() {
      controllerRef = null;
    },
  });

  const send = (event: string, data: unknown) => {
    if (!controllerRef) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    try {
      controllerRef.enqueue(encoder.encode(payload));
    } catch {
      // Stream closed — ignore
    }
  };

  const close = () => {
    if (!controllerRef) return;
    try {
      controllerRef.close();
    } catch {
      // already closed
    }
    controllerRef = null;
  };

  return { stream, send, close };
}

// ── POST handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!aiConfig.enabled) {
    return new Response(
      JSON.stringify({
        error: "AI not configured. Set AI_API_KEY or mount /run/secrets/9router_api_key.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Workspace from demo slug (matches tools.ts / conv-store)
  let wsId: string;
  try {
    wsId = await getWorkspaceForCurrentUser();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rate limit: AI requests per day based on plan (plan is per-user)
  const { getUserPlan, checkAiRateLimitDb, getPlanLimits } = await import("@/lib/plan");
  const plan = await getUserPlan(session.user.id);
  const limits = getPlanLimits(plan);

  if (!limits.hasAiAssistant) {
    return new Response(
      JSON.stringify({ error: "AI assistant tidak tersedia di plan Free. Upgrade ke Solo atau Team." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // DB-backed daily limit: persists across restarts + correct across instances.
  const aiRate = await checkAiRateLimitDb(wsId, plan);
  if (!aiRate.allowed) {
    const resetDate = new Date(aiRate.resetAt).toISOString();
    return new Response(
      JSON.stringify({
        error: `Batas ${aiRate.limit} request AI/hari tercapai. Reset setelah ${resetDate}.`,
        limit: aiRate.limit,
        resetAt: aiRate.resetAt,
      }),
      { status: 429, headers: { "Content-Type": "application/json", "X-RateLimit-Reset": resetDate } },
    );
  }

  // Persist user message first
  let conversationId: string;
  try {
    conversationId = await getOrCreateConv(
      wsId,
      session.user.id,
      body.conversationId,
    );

    // Cap history to last N user/assistant messages
    const userMsgs = body.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-MAX_HISTORY);
    const last = userMsgs[userMsgs.length - 1];
    if (!last || last.role !== "user") {
      return new Response(
        JSON.stringify({ error: "last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await appendMessage(conversationId, { role: "user", content: last.content });
    await maybeAutoTitle(conversationId, last.content);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const userMsgs = body.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY);

  // Build LLM message list: system + history
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMsgs.map((m) => ({ role: m.role, content: m.content })),
  ];

  // ── Set up SSE stream ──
  const { stream, send, close } = createSSEStream();

  // Run the agent loop in the background and close the stream when done
  // (we don't await it — we return the response immediately so the
  // browser sees headers and starts receiving events).
  void runAgentLoop({
    messages,
    send,
    close,
    persistAssistant: async (final, toolRecords, lastToolName, totalUsage) => {
      // Persist tool messages first
      for (const tm of toolRecords) {
        await appendMessage(conversationId, {
          role: "tool",
          content: JSON.stringify(tm.result),
          toolName: tm.name,
        });
      }
      // Persist the assistant final answer
      await appendMessage(conversationId, {
        role: "assistant",
        content: final,
        toolCalls: toolRecords.map((t) => ({ name: t.name })),
        toolName: lastToolName ?? undefined,
        tokens: totalUsage.completion_tokens,
      });
    },
  }).catch((err) => {
    send("error", {
      message: err instanceof Error ? err.message : "Internal error",
    });
    close();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({ enabled: aiConfig.enabled, model: aiConfig.model }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// ── Agent loop ──────────────────────────────────────────────────────

async function runAgentLoop(opts: {
  messages: ChatMessage[];
  send: (event: string, data: unknown) => void;
  close: () => void;
  persistAssistant: (
    finalContent: string,
    toolRecords: Array<{ name: string; result: unknown }>,
    lastToolName: string | null,
    totalUsage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    },
  ) => Promise<void>;
}) {
  const { messages, send, close, persistAssistant } = opts;

  let rounds = 0;
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let toolCallCount = 0;
  let lastAssistantContent = "";
  let lastToolName: string | null = null;
  const persistedToolMessages: Array<{ name: string; result: unknown }> = [];

  try {
    while (rounds <= MAX_TOOL_ROUNDS) {
      send("status", { phase: "thinking", label: "Thinking…" });

      // Stream the response
      const final = await streamChat(
        messages,
        (ev) => {
          if (ev.type === "content" && ev.content) {
            send("content", { delta: ev.content });
          }
          // We don't surface tool_call from the model here — we surface
          // them only after we've executed the tool (see "tool" event below).
        },
        { tools: TOOL_DEFS, toolChoice: "auto" },
      );

      totalUsage = {
        prompt_tokens: totalUsage.prompt_tokens + final.usage.prompt_tokens,
        completion_tokens:
          totalUsage.completion_tokens + final.usage.completion_tokens,
        total_tokens: totalUsage.total_tokens + final.usage.total_tokens,
      };
      const msg = final.message;

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        // Final answer — nothing more to do
        lastAssistantContent = msg.content ?? "";
        break;
      }

      rounds += 1;
      toolCallCount += msg.tool_calls.length;
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = tc.function.arguments
            ? JSON.parse(tc.function.arguments)
            : {};
        } catch {
          args = {};
        }
        send("status", {
          phase: "tool",
          label: `Running ${tc.function.name}…`,
          name: tc.function.name,
        });

        let result: unknown;
        try {
          result = await executeTool(
            tc.function.name,
            tc.function.arguments || "{}",
          );
        } catch (err) {
          result = { error: String(err instanceof Error ? err.message : err) };
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
        persistedToolMessages.push({ name: tc.function.name, result });

        // Send tool result to UI
        send("tool", {
          name: tc.function.name,
          args,
          result,
        });

        // Detect action-tool confirmation
        if (ACTION_TOOLS.has(tc.function.name)) {
          const r = result as { confirmation?: unknown; error?: string };
          if (r?.confirmation) {
            lastToolName = tc.function.name;
            // Persist immediately (UI is going to ask the user; we don't
            // know if they'll confirm yet — but the user msg + tool msg
            // and a stub assistant are now stable)
            await persistAssistant(
              lastAssistantContent,
              persistedToolMessages,
              lastToolName,
              totalUsage,
            );
            send("confirm", { tool: tc.function.name, confirmation: r.confirmation });
            send("done", {
              conversationId: undefined, // set by route via different path
              usage: totalUsage,
              toolCalls: toolCallCount,
            });
            close();
            return;
          }
        }
      }
    }

    if (rounds > MAX_TOOL_ROUNDS && !lastAssistantContent) {
      lastAssistantContent =
        "I tried a few queries but couldn't resolve that. Could you rephrase?";
      send("content", { delta: lastAssistantContent });
    }

    await persistAssistant(
      lastAssistantContent,
      persistedToolMessages,
      lastToolName,
      totalUsage,
    );

    send("done", {
      usage: totalUsage,
      toolCalls: toolCallCount,
    });
  } catch (err) {
    send("error", {
      message: err instanceof Error ? err.message : "Internal error",
    });
  } finally {
    close();
  }
}

// ── helpers ─────────────────────────────────────────────────────────

