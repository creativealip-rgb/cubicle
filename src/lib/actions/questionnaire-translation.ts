"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { checkAiRateLimitDb, getAiEntitlementFailure, getUserPlan } from "@/lib/plan";
import { chat, type ChatMessage } from "@/lib/ai/client";
import { safeParseQuestionnaireSchema, type QuestionnaireField } from "@/lib/questionnaire-schema";

export interface TranslateFormInput {
  targetLang: "en" | "id";
  title: string;
  description?: string;
  thankYouMessage?: string;
  fields: QuestionnaireField[];
}

export interface TranslateFormOutput {
  title: string;
  description?: string;
  thankYouMessage?: string;
  fields: QuestionnaireField[];
}

export async function translateQuestionnaireFields(
  input: TranslateFormInput
): Promise<TranslateFormOutput> {
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

  // Prepare payload to translate (clean, no unnecessary IDs/metadata)
  const payloadToTranslate = {
    title: input.title,
    description: input.description || "",
    thankYouMessage: input.thankYouMessage || "",
    fields: input.fields.map((f) => ({
      id: f.id,
      label: f.label,
      sublabel: f.sublabel || "",
      placeholder: f.placeholder || "",
      options: f.options || [],
      matrixRows: f.matrixRows || [],
      matrixCols: f.matrixCols || [],
      content: f.content || "",
    })),
  };

  const systemPrompt = `You are a professional multilingual translator for enterprise forms, proposals, and client intake surveys.
Your task is to accurately translate form content to ${targetLangName}.
Translate natural business tone, labels, placeholders, options, matrix items, and instructions.
Keep brand names or technical terms intact if standard.
Always return ONLY a valid JSON object matching the exact input structure:
{
  "title": "string",
  "description": "string",
  "thankYouMessage": "string",
  "fields": [
    {
      "id": "string (MUST match original ID exactly)",
      "label": "string",
      "sublabel": "string",
      "placeholder": "string",
      "options": ["string"],
      "matrixRows": ["string"],
      "matrixCols": ["string"],
      "content": "string"
    }
  ]
}`;

  const userPrompt = `Translate the following form payload into ${targetLangName}:\n${JSON.stringify(
    payloadToTranslate,
    null,
    2
  )}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await chat(messages, {
    temperature: 0.2,
  });

  const rawContent = response.message.content.trim();
  const cleanedJson = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    throw new Error("Failed to parse AI translation output. Please try again.");
  }

  // Merge translations back into existing fields
  const translatedMap = new Map<string, any>();
  if (Array.isArray(parsed.fields)) {
    for (const tf of parsed.fields) {
      if (tf && tf.id) {
        translatedMap.set(tf.id, tf);
      }
    }
  }

  const updatedFields: QuestionnaireField[] = input.fields.map((originalField) => {
    const t = translatedMap.get(originalField.id);
    if (!t) return originalField;

    const existingTranslations = originalField.translations || {};
    const langKey = input.targetLang;

    return {
      ...originalField,
      translations: {
        ...existingTranslations,
        [langKey]: {
          label: t.label || originalField.label,
          sublabel: t.sublabel || originalField.sublabel,
          placeholder: t.placeholder || originalField.placeholder,
          options: Array.isArray(t.options) && t.options.length > 0 ? t.options : originalField.options,
          matrixRows: Array.isArray(t.matrixRows) && t.matrixRows.length > 0 ? t.matrixRows : originalField.matrixRows,
          matrixCols: Array.isArray(t.matrixCols) && t.matrixCols.length > 0 ? t.matrixCols : originalField.matrixCols,
          content: t.content || originalField.content,
        },
      },
    };
  });

  return {
    title: parsed.title || input.title,
    description: parsed.description || input.description,
    thankYouMessage: parsed.thankYouMessage || input.thankYouMessage,
    fields: updatedFields,
  };
}
