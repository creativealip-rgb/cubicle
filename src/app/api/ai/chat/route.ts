/**
 * AI assistant chat endpoint.
 *
 * POST /api/ai/chat
 * Body: {
 *   messages: ChatMessage[],          // last must be user
 *   conversationId?: string,          // omit to start new
 * }
 * Returns: {
 *   message: { role, content, confirmation? },
 *   usage, toolCalls,
 *   conversationId,                    // for client to track
 * }
 *
 * Persistence: every user/assistant/tool message is saved to ai_messages.
 * Tool messages include the raw tool result so the next turn can reference.
 * The conversation is auto-titled from the first user message.
 *
 * Action tools (update_task_status, draft_invoice_reminder) return a
 * `confirmation` object inside the assistant message — UI shows a confirm
 * card and POSTs to /api/ai/action to actually execute.
 *
 * No streaming yet (Sprint F.1). Streaming lands in F.2.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { chat, type ChatMessage, aiConfig } from "@/lib/ai/client";
import { TOOL_DEFS, executeTool, ACTION_TOOLS } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import {
  appendMessage,
  getOrCreateConv,
  maybeAutoTitle,
} from "@/lib/ai/conv-store";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY = 20; // last N user+assistant turns

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!aiConfig.enabled) {
    return NextResponse.json(
      { error: "AI not configured. Set AI_API_KEY or mount /run/secrets/9router_api_key." },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  // Determine workspace from the demo slug (matches tools.ts).
  // The conv store uses the same hardcoded workspace.
  const wsId = await getWorkspaceId();

  // Persist: get-or-create conversation
  const conversationId = await getOrCreateConv(wsId, session.user.id, body.conversationId);

  // Cap history to last N user/assistant messages from the request
  const userMsgs = body.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY);
  const last = userMsgs[userMsgs.length - 1];
  if (!last || last.role !== "user") {
    return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
  }

  // Persist the user message
  await appendMessage(conversationId, { role: "user", content: last.content });
  await maybeAutoTitle(conversationId, last.content);

  // Build LLM message list: system + history (excluding the just-persisted user msg
  // because we re-derive it from `userMsgs` which already includes it)
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMsgs.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Tool execution loop
  let rounds = 0;
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let toolCallCount = 0;
  let lastAssistantContent = "";
  let lastConfirmation: unknown = null;
  let lastToolName: string | null = null;
  const persistedToolMessages: Array<{ name: string; result: unknown }> = [];

  while (rounds <= MAX_TOOL_ROUNDS) {
    const response = await chat(messages, { tools: TOOL_DEFS, toolChoice: "auto" });
    totalUsage = {
      prompt_tokens: totalUsage.prompt_tokens + response.usage.prompt_tokens,
      completion_tokens: totalUsage.completion_tokens + response.usage.completion_tokens,
      total_tokens: totalUsage.total_tokens + response.usage.total_tokens,
    };
    const msg = response.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // Final answer
      lastAssistantContent = msg.content ?? "";
      break;
    }

    rounds += 1;
    toolCallCount += msg.tool_calls.length;
    messages.push(msg);

    for (const tc of msg.tool_calls) {
      let result: unknown;
      try {
        result = await executeTool(tc.function.name, tc.function.arguments);
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

      // Detect action-tool confirmation in the result
      if (ACTION_TOOLS.has(tc.function.name)) {
        const r = result as { confirmation?: unknown; error?: string };
        if (r?.confirmation) {
          lastConfirmation = r.confirmation;
          lastToolName = tc.function.name;
          // For action tools, stop the loop and ask user to confirm
          // We still need to send a final assistant message — let the model
          // summarize the proposal. Add a synthetic user nudge.
          messages.push({
            role: "user",
            content:
              "A confirmation card is shown to the user. Briefly (1 sentence) describe what you propose and what happens after they confirm. Don't repeat the full details — the UI shows them.",
          });
          const final = await chat(messages, {
            tools: TOOL_DEFS,
            toolChoice: "none",
          });
          totalUsage = {
            prompt_tokens: totalUsage.prompt_tokens + final.usage.prompt_tokens,
            completion_tokens: totalUsage.completion_tokens + final.usage.completion_tokens,
            total_tokens: totalUsage.total_tokens + final.usage.total_tokens,
          };
          lastAssistantContent = final.message.content ?? "";
          break;
        }
      }
    }
    if (lastConfirmation) break;
  }

  // Persist tool messages (so the next turn can reference if needed)
  for (const tm of persistedToolMessages) {
    await appendMessage(conversationId, {
      role: "tool",
      content: JSON.stringify(tm.result),
      toolName: tm.name,
    });
  }
  // Persist the assistant final answer
  await appendMessage(conversationId, {
    role: "assistant",
    content: lastAssistantContent,
    toolCalls: persistedToolMessages.map((t) => ({ name: t.name })),
    toolName: lastToolName ?? undefined,
    tokens: totalUsage.completion_tokens,
  });

  if (rounds > MAX_TOOL_ROUNDS && !lastAssistantContent) {
    lastAssistantContent =
      "I tried a few queries but couldn't resolve that. Could you rephrase?";
  }

  return NextResponse.json({
    message: {
      role: "assistant" as const,
      content: lastAssistantContent,
      confirmation: lastConfirmation,
    },
    usage: totalUsage,
    toolCalls: toolCallCount,
    conversationId,
  });
}

export async function GET() {
  return NextResponse.json({
    enabled: aiConfig.enabled,
    model: aiConfig.model,
  });
}

// ─── helpers ───────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}
