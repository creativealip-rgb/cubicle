"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { checkAiRateLimitDb, getAiEntitlementFailure, getUserPlan } from "@/lib/plan";
import { chat, type ChatMessage } from "@/lib/ai/client";
import type { DocumentBlock } from "@/lib/document-blocks";

export interface TranslateDocumentInput {
  targetLang: "en" | "id";
  title: string;
  blocks: DocumentBlock[];
}

export interface TranslateDocumentOutput {
  title: string;
  blocks: DocumentBlock[];
}

export async function translateDocumentContent(
  input: TranslateDocumentInput
): Promise<TranslateDocumentOutput> {
  const sessionHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: sessionHeaders });
  const user = requireUser(sessionData?.user ?? null);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  // Plan & Quota check
  const plan = await getUserPlan(user.id);
  const entitlementFailure = getAiEntitlementFailure(plan);
  if (entitlementFailure) {
    throw new Error(entitlementFailure.error);
  }

  const aiRate = await checkAiRateLimitDb(workspaceId, user.id, plan);
  if (!aiRate.allowed) {
    throw new Error(`AI quota exceeded. Resets on ${new Date(aiRate.resetAt).toLocaleDateString()}`);
  }

  const targetLangName = input.targetLang === "en" ? "English" : "Indonesian";

  // Filter text blocks to translate
  const payloadToTranslate = {
    title: input.title,
    blocks: input.blocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: typeof b.content === "string" ? b.content : "",
      items: Array.isArray(b.items) ? b.items : [],
      rows: Array.isArray(b.rows) ? b.rows : [],
    })),
  };

  const systemPrompt = `You are a professional business translator for proposals, contracts, statements of work, and enterprise documents.
Your task is to accurately translate document content into bilingual format (e.g. "Teks Indonesia / English Translation") or directly into ${targetLangName}.
If input text already contains " / ", update the ${targetLangName} side properly.
Preserve all variable placeholders like {{client_name}}, {{today}}, {{total_amount}}, {{company_name}} exactly as they are.
Always return ONLY a valid JSON object matching this structure:
{
  "title": "string",
  "blocks": [
    {
      "id": "string",
      "content": "string",
      "items": ["string"],
      "rows": [["string"]]
    }
  ]
}`;

  const userPrompt = `Translate the following document into ${targetLangName}:\n\n${JSON.stringify(payloadToTranslate, null, 2)}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const rawAiResponse = await chat(messages, {
    temperature: 0.2,
    maxTokens: 3000,
  });

  const rawContent = rawAiResponse.message.content.trim();
  const cleanedJson = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: { title: string; blocks: Array<{ id: string; content?: string; items?: string[]; rows?: string[][] }> };

  try {
    parsed = JSON.parse(cleanedJson);
  } catch {
    throw new Error("Failed to parse AI translation output. Please try again.");
  }

  const blockMap = new Map(parsed.blocks.map((b) => [b.id, b]));

  const mergedBlocks: DocumentBlock[] = input.blocks.map((original) => {
    const translated = blockMap.get(original.id);
    if (!translated) return original;

    return {
      ...original,
      content: translated.content !== undefined ? translated.content : original.content,
      items: translated.items && translated.items.length > 0 ? translated.items : original.items,
      rows: translated.rows && translated.rows.length > 0 ? translated.rows : original.rows,
    };
  });

  return {
    title: parsed.title || input.title,
    blocks: mergedBlocks,
  };
}
