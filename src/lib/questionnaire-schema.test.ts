import { describe, expect, it } from "vitest";
import {
  questionnaireFieldSchema,
  questionnaireSchemaInput,
  safeParseQuestionnaireSchema,
} from "@/lib/questionnaire-schema";

const validField = {
  id: "f1",
  type: "text",
  label: "Full name",
  required: true,
};

describe("questionnaire field schema", () => {
  it("parses a valid field", () => {
    const result = questionnaireFieldSchema.parse(validField);
    expect(result.id).toBe("f1");
    expect(result.type).toBe("text");
    expect(result.label).toBe("Full name");
    expect(result.required).toBe(true);
  });

  it("defaults required to false when omitted", () => {
    const { required } = questionnaireFieldSchema.parse({ id: "f2", type: "email", label: "Email" });
    expect(required).toBe(false);
  });

  it("rejects unknown field types", () => {
    expect(() => questionnaireFieldSchema.parse({ ...validField, type: "checkbox" })).toThrow();
  });

  it("rejects fields without a label", () => {
    expect(() => questionnaireFieldSchema.parse({ id: "f3", type: "text", label: "" })).toThrow();
  });
});

describe("questionnaire schema input validation", () => {
  it("accepts up to 50 fields", () => {
    const fields = Array.from({ length: 50 }, (_, i) => ({
      id: `f${i}`,
      type: "text" as const,
      label: `Field ${i}`,
    }));
    expect(questionnaireSchemaInput.parse(fields)).toHaveLength(50);
  });

  it("rejects more than 50 fields", () => {
    const fields = Array.from({ length: 51 }, (_, i) => ({
      id: `f${i}`,
      type: "text" as const,
      label: `Field ${i}`,
    }));
    expect(() => questionnaireSchemaInput.parse(fields)).toThrow();
  });

  it("rejects an empty schema array", () => {
    expect(() => questionnaireSchemaInput.parse([])).toThrow();
  });

  it("rejects a schema containing a corrupt field", () => {
    expect(() =>
      questionnaireSchemaInput.parse([{ ...validField }, { id: 42, type: "nope", label: 42 }]),
    ).toThrow();
  });
});

describe("safeParseQuestionnaireSchema (stored JSONB fallback)", () => {
  it("returns [] for null", () => {
    expect(safeParseQuestionnaireSchema(null)).toEqual([]);
  });

  it("returns [] for a non-array JSONB value", () => {
    expect(safeParseQuestionnaireSchema({ corrupt: true })).toEqual([]);
  });

  it("returns [] for a string", () => {
    expect(safeParseQuestionnaireSchema("corrupt")).toEqual([]);
  });

  // The exact payload in the seeded legacy rows: a { fields: [...] } wrapper
  // whose entries carry no `id` at all.
  const legacyWrapper = {
    fields: [
      { type: "text", label: "Nama Perusahaan", required: true },
      { type: "select", label: "Budget Range", options: ["< 10 juta"], required: true },
    ],
  };

  it("loads the legacy { fields: [...] } wrapper and backfills missing ids", () => {
    // Reading these as "no fields" showed a blank builder, and the next save
    // overwrote the row with the editor's defaults — silent data loss.
    const parsed = safeParseQuestionnaireSchema(legacyWrapper);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ type: "text", label: "Nama Perusahaan", required: true });
    expect(parsed[1]).toMatchObject({ type: "select", label: "Budget Range" });
    expect(parsed.every((f) => typeof f.id === "string" && f.id.length > 0)).toBe(true);
  });

  it("backfills ids on a bare array of legacy fields too", () => {
    const parsed = safeParseQuestionnaireSchema([{ type: "text", label: "Legacy" }]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ type: "text", label: "Legacy" });
  });

  it("still returns [] for an object that is not the wrapper", () => {
    expect(safeParseQuestionnaireSchema({ fields: "nope" })).toEqual([]);
    expect(safeParseQuestionnaireSchema({ fields: [{ id: 1, type: "nope", label: 42 }] })).toEqual([]);
  });

  it("returns [] when any entry is corrupt (all-or-nothing fallback)", () => {
    expect(safeParseQuestionnaireSchema([validField, { id: 1, type: "nope", label: 42 }])).toEqual([]);
  });

  it("preserves valid stored fields", () => {
    expect(safeParseQuestionnaireSchema([validField])).toEqual([questionnaireFieldSchema.parse(validField)]);
  });

  it("accepts a stored empty array", () => {
    expect(safeParseQuestionnaireSchema([])).toEqual([]);
  });
});
