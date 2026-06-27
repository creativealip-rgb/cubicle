"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  promptTemplates,
  promptGenerations,
  workspaces,
  projects,
} from "@/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { readFileSync } from "fs";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

// ─── Templates ───

export async function listTemplates(workspaceId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = workspaceId || (await getWorkspaceId());
  await assertWorkspaceMember(db, user.id, wsId);

  return db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.workspaceId, wsId))
    .orderBy(promptTemplates.category, promptTemplates.name);
}

export async function listSystemTemplates(workspaceId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = workspaceId || (await getWorkspaceId());
  await assertWorkspaceMember(db, user.id, wsId);

  return db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.isSystem, true))
    .orderBy(promptTemplates.category, promptTemplates.name);
}

// ─── Generation ───

const generatePromptSchema = z.object({
  templateId: z.string().uuid(),
  input: z.record(z.string(), z.string()).default({}),
  model: z.string().default("ag/gemini-pro-agent"),
  projectId: z.string().uuid().optional(),
});

function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4": { input: 30.0, output: 60.0 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  };
  const p = pricing[model] ?? { input: 0.15, output: 0.6 };
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

// Monthly usage cap: $50
const MONTHLY_CAP_USD = 50;

export async function generatePrompt(
  input: z.infer<typeof generatePromptSchema>
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = generatePromptSchema.parse(input);

  // Check monthly cap
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
        gte(promptGenerations.createdAt, monthStart)
      )
    );

  const currentCost = Number(usage?.totalCost ?? "0");
  if (currentCost >= MONTHLY_CAP_USD) {
    throw new Error(`Monthly usage cap of $${MONTHLY_CAP_USD} reached. Current: $${currentCost.toFixed(4)}`);
  }

  // Fetch template
  const [tmpl] = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, parsed.templateId))
    .limit(1);

  if (!tmpl) throw new Error("Template not found");

  const filledPrompt = fillTemplate(tmpl.template, parsed.input);

  // Call OpenAI-compatible API (9Router/OpenAI/etc.)
  const apiKey =
    (() => {
      try {
        return readFileSync("/run/secrets/9router_api_key", "utf8").trim();
      } catch {
        return "";
      }
    })() ||
    process.env.NINE_ROUTER_API_KEY ||
    process.env.ROUTER_API_KEY ||
    process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || "http://172.17.0.1:20128/v1";

  if (!apiKey) {
    // Fallback: return placeholder for local dev
    console.warn("[PROMPTS] No OPENAI_API_KEY set — using simulated generation");
    const simulatedOutput = `[SIMULATED] Generated output for: "${filledPrompt.substring(0, 100)}..."`;

    const [gen] = await db
      .insert(promptGenerations)
      .values({
        workspaceId,
        projectId: parsed.projectId || null,
        templateId: parsed.templateId,
        input: parsed.input,
        generatedPrompt: filledPrompt,
        generatedOutput: simulatedOutput,
        model: parsed.model,
        inputTokens: filledPrompt.length,
        outputTokens: simulatedOutput.length,
        costUsd: "0",
        createdBy: user.id,
      })
      .returning();

    await writeActivityLog(workspaceId, user.id, "generated_prompt", "prompt_generation", gen.id);
    return { generation: gen, currentCost };
  }

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: parsed.model,
        messages: [{ role: "user", content: filledPrompt }],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errBody}`);
    }

    const rawText = (await response.text()).trimEnd();
    // Try SSE parsing first; fall back to plain JSON; strip any trailing noise.
    const dataLines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .filter((l) => l && l !== "[DONE]");

    let data: { choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } } = {};
    if (dataLines.length > 0) {
      // Use the LAST valid data line (SSE final chunk has finish_reason).
      for (let i = dataLines.length - 1; i >= 0; i--) {
        try {
          data = JSON.parse(dataLines[i]);
          break;
        } catch {
          /* try previous line */
        }
      }
    } else {
      // Plain JSON response: extract first complete JSON object, ignore trailing data.
      const firstBrace = rawText.indexOf("{");
      if (firstBrace < 0) {
        throw new Error("No JSON object found in response");
      }
      // Walk braces to find the end of the first top-level JSON object.
      let depth = 0;
      let inString = false;
      let escape = false;
      let endIdx = -1;
      for (let i = firstBrace; i < rawText.length; i++) {
        const ch = rawText[i];
        if (escape) { escape = false; continue; }
        if (inString) {
          if (ch === "\\") { escape = true; continue; }
          if (ch === '"') { inString = false; }
          continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) { endIdx = i + 1; break; }
        }
      }
      const jsonSlice = endIdx > 0 ? rawText.slice(firstBrace, endIdx) : rawText.slice(firstBrace);
      try {
        data = JSON.parse(jsonSlice);
      } catch (e) {
        throw new Error(`Failed to parse LLM response JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const generatedOutput =
      data.choices?.[0]?.message?.content ??
      dataLines
        .map((chunk) => {
          try {
            return JSON.parse(chunk).choices?.[0]?.delta?.content ?? "";
          } catch {
            return "";
          }
        })
        .join("") ??
      "";
    const usageData = data.usage ?? {};
    const inputTokens = usageData.prompt_tokens ?? 0;
    const outputTokens = usageData.completion_tokens ?? 0;
    const costUsd = estimateCost(parsed.model, inputTokens, outputTokens);

    const [gen] = await db
      .insert(promptGenerations)
      .values({
        workspaceId,
        projectId: parsed.projectId || null,
        templateId: parsed.templateId,
        input: parsed.input,
        generatedPrompt: filledPrompt,
        generatedOutput,
        model: parsed.model,
        inputTokens,
        outputTokens,
        costUsd: costUsd.toFixed(4),
        createdBy: user.id,
      })
      .returning();

    await writeActivityLog(workspaceId, user.id, "generated_prompt", "prompt_generation", gen.id);
    return { generation: gen, currentCost: currentCost + costUsd };
  } catch (err) {
    console.error("[PROMPTS] Generation failed:", err);
    throw new Error(`Prompt generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

// ─── History ───

export async function listGenerations(workspaceId?: string, projectId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = workspaceId || (await getWorkspaceId());
  await assertWorkspaceMember(db, user.id, wsId);

  const conditions = [eq(promptGenerations.workspaceId, wsId)];
  if (projectId) conditions.push(eq(promptGenerations.projectId, projectId));

  return db
    .select({
      id: promptGenerations.id,
      templateId: promptGenerations.templateId,
      templateName: promptTemplates.name,
      generatedOutput: promptGenerations.generatedOutput,
      model: promptGenerations.model,
      inputTokens: promptGenerations.inputTokens,
      outputTokens: promptGenerations.outputTokens,
      costUsd: promptGenerations.costUsd,
      projectId: promptGenerations.projectId,
      projectName: projects.name,
      createdAt: promptGenerations.createdAt,
    })
    .from(promptGenerations)
    .leftJoin(promptTemplates, eq(promptTemplates.id, promptGenerations.templateId))
    .leftJoin(projects, eq(projects.id, promptGenerations.projectId))
    .where(and(...conditions))
    .orderBy(desc(promptGenerations.createdAt))
    .limit(50);
}

export async function deleteGeneration(generationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [gen] = await db
    .select()
    .from(promptGenerations)
    .where(
      and(
        eq(promptGenerations.id, generationId),
        eq(promptGenerations.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!gen) throw new Error("Generation not found");

  await db.delete(promptGenerations).where(eq(promptGenerations.id, generationId));
  await writeActivityLog(workspaceId, user.id, "deleted_prompt_generation", "prompt_generation", generationId);
  return { success: true };
}

// ─── Monthly Usage ───

export async function getMonthlyUsage(workspaceId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = workspaceId || (await getWorkspaceId());
  await assertWorkspaceMember(db, user.id, wsId);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({
      totalInputTokens: sql<number>`coalesce(sum(${promptGenerations.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(${promptGenerations.outputTokens}), 0)`,
      totalCost: sql<string>`coalesce(sum(${promptGenerations.costUsd}), '0')`,
    })
    .from(promptGenerations)
    .where(
      and(
        eq(promptGenerations.workspaceId, wsId),
        gte(promptGenerations.createdAt, monthStart)
      )
    );

  return {
    totalInputTokens: Number(result?.totalInputTokens ?? 0),
    totalOutputTokens: Number(result?.totalOutputTokens ?? 0),
    totalCost: Number(result?.totalCost ?? 0),
    monthlyCap: MONTHLY_CAP_USD,
  };
}

// ─── Helper: extract template variables ───

export async function getTemplateVariables(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  await requireUser(session?.user);

  const [tmpl] = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, templateId))
    .limit(1);

  if (!tmpl) throw new Error("Template not found");
  return extractVariables(tmpl.template);
}
