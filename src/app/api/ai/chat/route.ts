/**
 * AI assistant chat endpoint.
 *
 * POST /api/ai/chat
 * Body: { messages: ChatMessage[] }   (last message should be 'user')
 * Returns: { message: ChatMessage, usage, toolCalls: number }
 *
 * Phase 1: agentic RAG, no embeddings, no streaming. Up to 3 tool
 * rounds per turn. History is client-side (in-memory per session).
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { chat, type ChatMessage, aiConfig } from "@/lib/ai/client";
import { TOOL_DEFS, executeTool } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY = 20; // last N messages

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!aiConfig.enabled) {
    return NextResponse.json(
      {
        error:
          "AI not configured. Set AI_API_KEY or mount /run/secrets/9router_api_key.",
      },
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
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 },
    );
  }

  // Cap history + ensure last message is user
  const userMessages = body.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY);
  const last = userMessages[userMessages.length - 1];
  if (!last || last.role !== "user") {
    return NextResponse.json(
      { error: "last message must be from user" },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Tool execution loop
  let rounds = 0;
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let toolCallCount = 0;

  while (rounds <= MAX_TOOL_ROUNDS) {
    const response = await chat(messages, { tools: TOOL_DEFS, toolChoice: "auto" });
    totalUsage = {
      prompt_tokens: totalUsage.prompt_tokens + response.usage.prompt_tokens,
      completion_tokens:
        totalUsage.completion_tokens + response.usage.completion_tokens,
      total_tokens: totalUsage.total_tokens + response.usage.total_tokens,
    };

    const msg = response.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // Final answer
      return NextResponse.json({
        message: { role: "assistant", content: msg.content ?? "" },
        usage: totalUsage,
        toolCalls: toolCallCount,
      });
    }

    // Tool calls present → execute and re-call
    rounds += 1;
    toolCallCount += msg.tool_calls.length;
    messages.push(msg); // include the assistant tool_call message

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
    }
  }

  // Hit max rounds
  return NextResponse.json({
    message: {
      role: "assistant",
      content:
        "I tried a few queries but couldn't resolve that. Could you rephrase?",
    },
    usage: totalUsage,
    toolCalls: toolCallCount,
  });
}

export async function GET() {
  return NextResponse.json({
    enabled: aiConfig.enabled,
    model: aiConfig.model,
  });
}
