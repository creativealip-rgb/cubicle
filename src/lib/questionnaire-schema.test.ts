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

  it("returns [] when any entry is corrupt (all-or-nothing fallback)", () => {
    expect(safeParseQuestionnaireSchema([validField, { id: 1, type: "nope", label: 42 }])).toEqual([]);
  });

  it("preserves valid stored fields", () => {
    expect(safeParseQuestionnaireSchema([validField])).toEqual([
      { id: "f1", type: "text", label: "Full name", required: true },
    ]);
  });

  it("accepts a stored empty array", () => {
    expect(safeParseQuestionnaireSchema([])).toEqual([]);
  });
});
