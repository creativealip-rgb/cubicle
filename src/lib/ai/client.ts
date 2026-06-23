/**
 * AI client for the workspace assistant.
 *
 * Uses an OpenAI-compatible chat-completions endpoint (9router).
 * Loads credentials the same way the existing prompts action does:
 *   1. /run/secrets/9router_api_key (production docker secret)
 *   2. AI_API_KEY env (fallback)
 * Base URL: AI_BASE_URL env, default 9router.
 * Model: AI_MODEL env, default ag/gemini-3-flash.
 */

import { readFileSync } from "fs";

function getApiKey(): string {
  try {
    return readFileSync("/run/secrets/9router_api_key", "utf8").trim();
  } catch {
    return process.env.AI_API_KEY || "";
  }
}

function getBaseUrl(): string {
  return (
    process.env.AI_BASE_URL ||
    "http://10.0.1.12:20128/v1"
  );
}

function getModel(): string {
  return process.env.AI_MODEL || "ag/gemini-3-flash";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export { stripThinking } from "./strip";
import { stripThinking as _stripThinking } from "./strip";

export async function chat(
  messages: ChatMessage[],
  options: {
    tools?: ToolDefinition[];
    toolChoice?: "auto" | "required" | "none";
    maxTokens?: number;
    temperature?: number;
  } = {},
): Promise<ChatResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "AI not configured: set AI_API_KEY or mount /run/secrets/9router_api_key",
    );
  }

  const body: Record<string, unknown> = {
    model: getModel(),
    messages,
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.4,
    // Always stream — 9router appends `data: [DONE]` SSE terminator to
    // non-stream responses too, which breaks res.json(). We parse the
    // first chat.completion chunk and ignore the rest.
    stream: true,
    // NOTE: do NOT send `reasoning: { effort: 'low' }` — see streamChat.
  };
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice ?? "auto";
  }

  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.body) {
    throw new Error("AI: no response body");
  }

  // Parse the first valid chat.completion chunk from the SSE stream.
  // 9router sends one JSON object per call, then `data: [DONE]`.
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  type ParsedChunk = {
    choices?: Array<{
      delta?: {
        content?: string | null;
        tool_calls?: Array<{
          index?: number;
          id?: string;
          type?: string;
          function?: { name?: string; arguments?: string };
        }>;
      };
      finish_reason?: string;
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  let content = "";
  const toolCalls: ToolCall[] = [];
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let gotFinal = false;

  try {
    while (!gotFinal) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const dataLines: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const data = dataLines.join("\n");
        if (data === "[DONE]") {
          gotFinal = true;
          break;
        }

        let chunk: ParsedChunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }

        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens ?? usage.prompt_tokens,
            completion_tokens:
              chunk.usage.completion_tokens ?? usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens ?? usage.total_tokens,
          };
        }

        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          content += delta.content;
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            while (toolCalls.length <= idx) {
              toolCalls.push({
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
              });
            }
            const t = toolCalls[idx];
            if (tc.id) t.id = tc.id;
            t.type = "function";
            if (tc.function?.name) t.function.name += tc.function.name;
            if (tc.function?.arguments) {
              t.function.arguments += tc.function.arguments;
            }
          }
        }
        if (choice.finish_reason === "tool_calls" || choice.finish_reason === "stop") {
          gotFinal = true;
          break;
        }
      }
    }
  } catch (err) {
    throw err;
  }

  const raw: ChatMessage = {
    role: "assistant",
    content: _stripThinking(content),
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
  return {
    message: raw,
    usage,
  };
}

export interface StreamEvent {
  type:
    | "content" // text delta
    | "tool_call" // finished tool call (after finish_reason=tool_calls)
    | "usage" // token usage
    | "done"; // final, no more data
  content?: string;
  toolCall?: ToolCall;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Streamed chat completion.
 * Calls 9router with stream:true, parses SSE chunks, emits typed events.
 * Accumulates content deltas and tool_calls (with arguments streaming).
 * Reasoning-model content is stripped of <think>…</think> inline.
 */
export async function streamChat(
  messages: ChatMessage[],
  onEvent: (e: StreamEvent) => void,
  options: {
    tools?: ToolDefinition[];
    toolChoice?: "auto" | "required" | "none";
    maxTokens?: number;
    temperature?: number;
  } = {},
): Promise<{
  message: ChatMessage;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "AI not configured: set AI_API_KEY or mount /run/secrets/9router_api_key",
    );
  }

  const body: Record<string, unknown> = {
    model: getModel(),
    messages,
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.4,
    stream: true,
    // NOTE: do NOT send `reasoning: { effort: 'low' }` — empirically this
    // model emits XML-style <function_calls> in content instead of native
    // tool_calls. We rely on the system prompt + post-hoc stripThinking()
    // to keep the user-visible content clean.
  };
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice ?? "auto";
  }

  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.body) {
    throw new Error("AI stream: no response body");
  }

  // SSE parser
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // Accumulator
  let content = "";
  const toolCalls: ToolCall[] = [];
  let finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Per-OpenAI spec, tool_calls in deltas are partial — same `index`, growing
  // `id` and `function.arguments` strings. We merge into toolCalls[index].
  const mergeToolCall = (delta: {
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }) => {
    const idx = delta.index ?? 0;
    while (toolCalls.length <= idx) {
      toolCalls.push({
        id: "",
        type: "function",
        function: { name: "", arguments: "" },
      });
    }
    const tc = toolCalls[idx];
    if (delta.id) tc.id = delta.id;
    if (delta.type) {
      // OpenAI spec always uses "function" for chat-completions tools.
      // Coerce to satisfy the ToolCall.type literal.
      tc.type = "function";
    }
    if (delta.function?.name) tc.function.name += delta.function.name;
    if (delta.function?.arguments) tc.function.arguments += delta.function.arguments;
  };

  let pendingEmit = "";
  let emitTimer: ReturnType<typeof setTimeout> | null = null;
  const flushPending = () => {
    if (pendingEmit) {
      onEvent({ type: "content", content: pendingEmit });
      pendingEmit = "";
    }
    emitTimer = null;
  };
  const queueEmit = (delta: string) => {
    pendingEmit += delta;
    if (!emitTimer) {
      // 60ms throttle: balance responsiveness vs. render churn
      emitTimer = setTimeout(flushPending, 60);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on \n\n (SSE event boundary). Handle partial lines by holding
      // onto the trailing fragment in `buffer`.
      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const eventBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        // Each event can have multiple lines: `event:` + `data:`.
        // We only care about `data:` lines.
        const dataLines: string[] = [];
        for (const line of eventBlock.split("\n")) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const data = dataLines.join("\n");
        if (data === "[DONE]") {
          // Final flush
          if (emitTimer) {
            clearTimeout(emitTimer);
            flushPending();
          }
          onEvent({
            type: "usage",
            usage: finalUsage,
          });
          onEvent({ type: "done" });
          return {
            message: {
              role: "assistant",
              content: content,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            },
            usage: finalUsage,
          };
        }

        let chunk: {
          choices?: Array<{
            delta?: {
              content?: string | null;
              tool_calls?: Parameters<typeof mergeToolCall>[0][];
            };
            finish_reason?: string;
          }>;
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        };
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }

        // Some chunks carry usage only (no choices) — capture and continue
        if (chunk.usage) {
          finalUsage = {
            prompt_tokens: chunk.usage.prompt_tokens ?? finalUsage.prompt_tokens,
            completion_tokens:
              chunk.usage.completion_tokens ?? finalUsage.completion_tokens,
            total_tokens: chunk.usage.total_tokens ?? finalUsage.total_tokens,
          };
        }

        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          // Strip any <think>…</think> that may have streamed (defense in depth)
          const piece = _stripThinking(delta.content);
          if (piece) {
            content += piece;
            queueEmit(piece);
          }
        }
        if (delta?.tool_calls && delta.tool_calls.length > 0) {
          for (const tc of delta.tool_calls) mergeToolCall(tc);
        }
        if (choice.finish_reason === "tool_calls") {
          // Flush any pending content, then emit tool_call events
          if (emitTimer) {
            clearTimeout(emitTimer);
            flushPending();
          }
          for (const tc of toolCalls) {
            onEvent({ type: "tool_call", toolCall: tc });
          }
        }
      }
    }
  } catch (err) {
    if (emitTimer) clearTimeout(emitTimer);
    throw err;
  }

  // Stream ended without [DONE] — still flush
  if (emitTimer) {
    clearTimeout(emitTimer);
    flushPending();
  }
  return {
    message: {
      role: "assistant",
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
    usage: finalUsage,
  };
}

export const aiConfig = {
  get enabled() {
    return getApiKey().length > 0;
  },
  model: getModel(),
  baseUrl: getBaseUrl(),
};
