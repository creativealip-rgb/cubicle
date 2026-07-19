"use server";

import { readFileSync } from "fs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { promptGenerations } from "@/db/schema";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const MONTHLY_CAP_USD = 50;

const visualPromptSchema = z.object({
  mode: z.string().min(1),
  brand: z.string().min(1),
  product: z.string().min(1),
  offer: z.string().optional().default(""),
  audience: z.string().optional().default(""),
  style: z.string().optional().default("Clean commercial"),
  ratio: z.string().optional().default("1:1 Instagram"),
  color: z.string().optional().default("brand colors"),
  notes: z.string().optional().default(""),
  draftPrompt: z.string().optional().default(""),
  model: z.string().optional().default("ag/gemini-pro-agent"),
});

function getApiKey() {
  try {
    const secret = readFileSync("/run/secrets/9router_api_key", "utf8").trim();
    if (secret) return secret;
  } catch {
    // ignore missing docker secret
  }
  return (
    process.env.AI_API_KEY ||
    process.env.NINE_ROUTER_API_KEY ||
    process.env.ROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4": { input: 30.0, output: 60.0 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    "ag/gemini-pro-agent": { input: 0.15, output: 0.6 },
    "ag/gemini-flash-agent": { input: 0.075, output: 0.3 },
  };
  const p = pricing[model] ?? { input: 0.15, output: 0.6 };
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

function parseAiResponse(rawText: string) {
  const text = rawText.trimEnd();
  const dataLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  let content = "";
  let promptTokens = 0;
  let completionTokens = 0;

  if (dataLines.length) {
    for (const chunk of dataLines) {
      try {
        const data = JSON.parse(chunk);
        content +=
          data.choices?.[0]?.delta?.content ??
          data.choices?.[0]?.message?.content ??
          "";
        if (data.usage) {
          promptTokens = Number(data.usage.prompt_tokens ?? promptTokens) || promptTokens;
          completionTokens =
            Number(data.usage.completion_tokens ?? completionTokens) || completionTokens;
        }
      } catch {
        // skip bad chunk
      }
    }
    return {
      content: content.trim(),
      promptTokens,
      completionTokens,
    };
  }

  const data = JSON.parse(text);
  return {
    content: String(data.choices?.[0]?.message?.content ?? "").trim(),
    promptTokens: Number(data.usage?.prompt_tokens ?? 0) || 0,
    completionTokens: Number(data.usage?.completion_tokens ?? 0) || 0,
  };
}

function buildSystemPrompt() {
  return `You are Cubiqlo Visual Prompt Studio, an Indonesian commercial creative director for AI-generated ads. Produce practical, production-ready outputs like Auto Feeds style tools, but do not mention Auto Feeds. Always answer in Indonesian unless user input is English. Be specific, structured, and ready to paste into image/video generation tools.`;
}

function buildUserPrompt(input: z.infer<typeof visualPromptSchema>) {
  return `Buat output kreatif untuk mode: ${input.mode}.

BRIEF
Brand: ${input.brand}
Product/Campaign: ${input.product}
Offer: ${input.offer}
Audience: ${input.audience}
Style: ${input.style}
Ratio/Platform: ${input.ratio}
Color palette: ${input.color}
Notes: ${input.notes}
Draft prompt awal: ${input.draftPrompt}

OUTPUT WAJIB:
1. Final visual prompt siap paste ke AI image/design tool
2. Overlay copy: headline, subheadline, CTA, badge
3. Layout/composition direction
4. Caption pendek untuk posting/ads
5. Negative prompt
6. Export checklist

Jika mode adalah 9 Feed Konsisten, buat 9 post plan. Jika Carousel, buat 7 slide plan. Jika Storyboard, buat 8 scene plan. Jika Copy Writing, buat 10 variasi hook/body/CTA.`;
}

export async function generateVisualPrompt(rawInput: z.input<typeof visualPromptSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const input = visualPromptSchema.parse(rawInput);
  const generatedPrompt = buildUserPrompt(input);
  const apiKey = getApiKey();
  const apiBase =
    process.env.OPENAI_API_BASE || process.env.AI_BASE_URL || "http://9router:20128/v1";

  // Monthly cap check from real stored cost
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [usage] = await db
    .select({
      totalCost: sql<string>`coalesce(sum(${promptGenerations.costUsd}), '0')`,
    })
    .from(promptGenerations)
    .where(
      and(
        eq(promptGenerations.workspaceId, workspaceId),
        gte(promptGenerations.createdAt, monthStart),
      ),
    );
  const currentCost = Number(usage?.totalCost ?? "0");
  if (currentCost >= MONTHLY_CAP_USD) {
    throw new Error(
      `Monthly usage cap of $${MONTHLY_CAP_USD} reached. Current: $${currentCost.toFixed(4)}`,
    );
  }

  let generatedOutput = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = "0.0000";

  if (!apiKey) {
    generatedOutput = `[SIMULATED AI]\n\n${generatedPrompt}\n\nTambahkan API key agar output digenerate AI beneran.`;
    inputTokens = Math.ceil(generatedPrompt.length / 4);
    outputTokens = Math.ceil(generatedOutput.length / 4);
    costUsd = estimateCost(input.model, inputTokens, outputTokens).toFixed(4);
  } else {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: generatedPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3500,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI API error: ${response.status} ${body}`);
    }

    const rawText = await response.text();
    const parsed = parseAiResponse(rawText);
    generatedOutput = parsed.content || "AI returned empty output.";
    inputTokens =
      parsed.promptTokens || Math.ceil((buildSystemPrompt().length + generatedPrompt.length) / 4);
    outputTokens = parsed.completionTokens || Math.ceil(generatedOutput.length / 4);
    costUsd = estimateCost(input.model, inputTokens, outputTokens).toFixed(4);
  }

  const [generation] = await db
    .insert(promptGenerations)
    .values({
      workspaceId,
      input,
      generatedPrompt,
      generatedOutput,
      model: input.model,
      inputTokens,
      outputTokens,
      costUsd,
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(
    workspaceId,
    user.id,
    "generated_visual_prompt",
    "prompt_generation",
    generation.id,
  );

  revalidatePath("/app/prompts");

  return {
    generation,
    usage: {
      inputTokens,
      outputTokens,
      costUsd: Number(costUsd),
      monthlyCost: currentCost + Number(costUsd),
      monthlyCap: MONTHLY_CAP_USD,
    },
  };
}
