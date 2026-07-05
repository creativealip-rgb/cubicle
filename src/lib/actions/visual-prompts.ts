"use server";

import { readFileSync } from "fs";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { promptGenerations } from "@/db/schema";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

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
  return process.env.AI_API_KEY || process.env.NINE_ROUTER_API_KEY || process.env.ROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
}

function extractContent(rawText: string) {
  const text = rawText.trimEnd();
  const dataLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  if (dataLines.length) {
    return dataLines
      .map((chunk) => {
        try {
          const data = JSON.parse(chunk);
          return data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content ?? "";
        } catch {
          return "";
        }
      })
      .join("")
      .trim();
  }

  const data = JSON.parse(text);
  return String(data.choices?.[0]?.message?.content ?? "").trim();
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
  const apiBase = process.env.OPENAI_API_BASE || process.env.AI_BASE_URL || "http://9router:20128/v1";

  let generatedOutput = "";
  let inputTokens = generatedPrompt.length;
  let outputTokens = 0;
  let costUsd = "0";

  if (!apiKey) {
    generatedOutput = `[SIMULATED AI]\n\n${generatedPrompt}\n\nTambahkan API key agar output digenerate AI beneran.`;
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
    generatedOutput = extractContent(rawText) || "AI returned empty output.";
    inputTokens = Math.ceil(generatedPrompt.length / 4);
    outputTokens = Math.ceil(generatedOutput.length / 4);
    costUsd = "0.0000";
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

  await writeActivityLog(workspaceId, user.id, "generated_visual_prompt", "prompt_generation", generation.id);

  return { generation };
}
