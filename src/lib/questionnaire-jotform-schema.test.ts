import { describe, it, expect } from "vitest";
import { questionnaireFieldSchema, safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";

describe("Jotform-Style Form Schema Validation", () => {
  it("validates basic, choice, and advanced fields", () => {
    const validFields = [
      {
        id: "f_1",
        type: "text",
        label: "Nama",
        required: true,
      },
      {
        id: "f_2",
        type: "select",
        label: "Layanan",
        options: ["Web Dev", "Branding"],
        required: false,
      },
      {
        id: "f_3",
        type: "file",
        label: "Upload Brief",
        acceptFiles: ".pdf,.png",
        required: false,
        condition: {
          fieldId: "f_2",
          operator: "equals",
          value: "Web Dev",
        },
      },
      {
        id: "f_4",
        type: "signature",
        label: "Tanda Tangan",
        required: true,
      },
    ];

    const parsed = safeParseQuestionnaireSchema(validFields);
    expect(parsed).toHaveLength(4);
    expect(parsed[2].condition?.fieldId).toBe("f_2");
    expect(parsed[2].condition?.value).toBe("Web Dev");
  });
});
