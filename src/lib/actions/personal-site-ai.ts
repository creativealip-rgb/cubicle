"use server";

import { readFileSync } from "fs";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import * as copy from "@/lib/ai/copy";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

/**
 * Generate AI-powered copy for a personal site section.
 * 
 * Input: sectionType (services|faq|cta), businessName, niche, targetAudience, offer, tone.
 * Auth: requires logged-in user with writable access to current workspace.
 * Uses 9Router/OpenAI-compatible endpoint via AI_BASE_URL + API key resolver.
 * Returns structured section patch only — never modifies client state directly.
 * Supports services (exactly 3 cards), FAQ (exactly 5 items), and CTA sections.
 * Implements raw/fenced JSON parsing with strict Zod validation.
 * Throws clear errors for missing config or upstream failures.
 * No database writes - returns patch only for UI apply action.
 */
export async function generatePersonalSiteCopy(
  input: unknown,
): Promise<{ sectionType: string; patch: PersonalSiteSection; usage?: { tokens: number } }> {
  const sessionHeaders = await headers();
  
  // Authenticate user & ensure workspace writable access (matches visual-prompts.ts pattern)
  const sessionData = await auth.api.getSession({ headers: sessionHeaders });
  const user = requireUser(sessionData?.user ?? null);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  // Validate input schema strictly
  let parsedInput;
  try {
    parsedInput = copy.personalSiteAiInputSchema.parse(input);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    throw new Error(`Parameter tidak valid: ${errorMsg}`);
  }

  // Check AI configuration with clear error
  const apiKeyFromSecret = resolveApiKeyFromSecret();
  const apiKeyFromEnv = copy.resolveApiKeyFromEnv(process.env);
  const apiKey = apiKeyFromSecret || apiKeyFromEnv;
  if (!apiKey) {
    throw new Error(copy.MISSING_AI_KEY_MESSAGE);
  }

  // Build system + user prompts with exact constraints
  const prompts = copy.buildCopyPrompt(parsedInput);
  const messages = [
    { role: "system" as const, content: prompts.system },
    { role: "user" as const, content: prompts.user },
  ];

  // Fetch from OpenAI-compatible endpoint
  const baseUrl = process.env.AI_BASE_URL || "http://9router:20128/v1";
  const model = process.env.AI_MODEL || "ag/gemini-3.6-flash-low";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("AI call failed:", response.status, text.slice(0, 200));
    throw new Error(copy.AI_PROVIDER_ERROR_MESSAGE);
  }

  // Handle both stream (SSE) and non-stream responses
  const contentType = response.headers.get("content-type") || "";
  let rawText = "";
  if (contentType.includes("text/event-stream")) {
    rawText = await parseResponseWithSse(response.body!);
  } else {
    rawText = await response.text();
  }

  // Extract assistant content from raw/text or SSE chunks
  const content = copy.extractChatContent(rawText);
  if (!content || content.trim().length < 5) {
    throw new Error("AI menghasilkan output kosong — coba lagi.");
  }

  // Parse the LLM's JSON response (raw/fenced JSON)
  let parsedOutput;
  try {
    parsedOutput = copy.parseAiJson(content);
  } catch (err) {
    throw new Error(copy.AI_PARSE_ERROR_MESSAGE);
  }

  // Build canonical section patch with fresh nested IDs
  let patch;
  try {
    patch = copy.buildSectionPatch(parsedInput, parsedOutput);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Format jawaban AI salah untuk tipe "${parsedInput.sectionType}": ${message}`);
  }

  // Return structured patch only - no DB writes
  return {
    sectionType: parsedInput.sectionType,
    patch,
    usage: undefined,
  };
}

/** Resolve API key from Docker secret path (production). Falls back to no value if unavailable. */
function resolveApiKeyFromSecret(): string {
  try {
    const secret = readFileSync("/run/secrets/9router_api_key", "utf8").trim();
    return secret || "";
  } catch {
    return "";
  }
}

/**
 * Parse OpenAI-compatible response body that may contain SSE streaming.
 * Follows visual-prompts.ts pattern: read full body, extract data: lines.
 */
async function parseResponseWithSse(body: ReadableStream): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let result = "";
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  
  return result;
}
