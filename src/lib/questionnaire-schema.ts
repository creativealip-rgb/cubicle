import { z } from "zod";

// ─── Shared questionnaire field schema ───
// Single source of truth for the form-builder field shape, used by:
// - server actions (create/update validation)
// - app pages (edit/detail rendering)
// - the public intake route + submit validation

export const questionnaireFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "multiselect",
  "number",
  "date",
  "time",
  "email",
  "url",
  "phone",
  "file",
  "signature",
  "rating",
  "heading",
  "divider",
  "info",
  "terms",
]);

export type QuestionnaireFieldType = z.infer<typeof questionnaireFieldTypeSchema>;

export const questionnaireFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: questionnaireFieldTypeSchema,
  label: z.string().min(1).max(200),
  sublabel: z.string().max(500).optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  acceptFiles: z.string().optional(),
  maxRating: z.number().int().min(3).max(10).optional(),
  // Layout Column: "full" (100%) or "half" (50% 2-column inline shrink)
  colSpan: z.enum(["full", "half"]).default("full").optional(),
  // Info text content (for 'info' type) or terms text (for 'terms' type)
  content: z.string().max(2000).optional(),
  // Conditional Logic: show this field only if another field matches a value
  condition: z
    .object({
      fieldId: z.string().min(1),
      operator: z.enum(["equals", "not_equals", "is_filled", "is_empty"]).default("equals"),
      value: z.string().optional(),
    })
    .optional(),
});

export type QuestionnaireField = z.infer<typeof questionnaireFieldSchema>;

// Input validation for create/update payloads: at least one field, max 50.
export const questionnaireSchemaInput = z.array(questionnaireFieldSchema).min(1).max(50);

// Safe reader for the stored JSONB `schema` column.
// Corrupt/legacy data (null, object, string, bad entries) falls back to an
// empty array so callers can safely iterate instead of crashing on `.map`.
// A stored empty array is legitimate (DB default is '[]'), so it is preserved.
const storedSchemaList = z.array(questionnaireFieldSchema).max(50);

export function safeParseQuestionnaireSchema(value: unknown): QuestionnaireField[] {
  if (!Array.isArray(value)) return [];
  const result = storedSchemaList.safeParse(value);
  return result.success ? result.data : [];
}
