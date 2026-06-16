/**
 * AI client for the workspace assistant.
 *
 * Uses an OpenAI-compatible chat-completions endpoint (9router).
 * Loads credentials the same way the existing prompts action does:
 *   1. /run/secrets/9router_api_key (production docker secret)
 *   2. AI_API_KEY env (fallback)
 * Base URL: AI_BASE_URL env, default 9router.
 * Model: AI_MODEL env, default tr/MiniMax-M3.
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
    "https://9router-168-144-37-19.sslip.io/v1"
  );
}

function getModel(): string {
  return process.env.AI_MODEL || "tr/MiniMax-M3";
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
    stream: false,
    // Reasoning models: ask for low-effort / no visible chain-of-thought
    // (9router passes this through to MiniMax where supported)
    reasoning: { effort: "low" },
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

  const data = (await res.json()) as {
    choices: { message: ChatMessage }[];
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  const raw = data.choices[0].message;
  // Defense in depth: strip any reasoning that slipped into content
  if (raw.content) {
    raw.content = _stripThinking(raw.content);
  }
  return {
    message: raw,
    usage: data.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export const aiConfig = {
  get enabled() {
    return getApiKey().length > 0;
  },
  model: getModel(),
  baseUrl: getBaseUrl(),
};
