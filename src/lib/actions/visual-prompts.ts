"use server";

import { readFileSync } from "fs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { promptGenerations } from "@/db/schema";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";
import { promptBriefSchema } from "@/lib/prompts/catalog";
import { buildPromptRequest, parsePromptResult, serializePromptResult } from "@/lib/prompts/build-prompt";

const MONTHLY_CAP_USD = 50;

const visualPromptSchema = promptBriefSchema.transform((input) => ({
  ...input,
  model: input.model || "ag/gemini-pro-agent",
}));

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


export async function generateVisualPrompt(rawInput: unknown) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const input = visualPromptSchema.parse(rawInput);
  const request = buildPromptRequest(input);
  const generatedPrompt = request.userPrompt;
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
    generatedOutput = serializePromptResult({
      version: 1,
      promptType: input.promptType,
      title: `${input.campaign} — draft`,
      readyOutput: [{ label: "Draft materi", content: "Konfigurasi AI belum tersedia di environment ini." }],
      technicalPrompt: generatedPrompt,
    });
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
          { role: "system", content: request.systemPrompt },
          { role: "user", content: generatedPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3500,
      }),
    });

    if (!response.ok) {
      await response.text();
      throw new Error("Layanan AI sedang bermasalah. Coba lagi beberapa saat.");
    }

    const rawText = await response.text();
    const parsed = parseAiResponse(rawText);
    const normalized = parsePromptResult(parsed.content, input.promptType);
    generatedOutput = serializePromptResult(normalized.result);
    inputTokens =
      parsed.promptTokens || Math.ceil((request.systemPrompt.length + generatedPrompt.length) / 4);
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
