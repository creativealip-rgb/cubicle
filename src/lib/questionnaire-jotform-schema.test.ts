import { describe, it, expect } from "vitest";
import { questionnaireFieldSchema, safeParseQuestionnaireSchema } from "@/lib/questionnaire-schema";

describe("Jotform-Style Form Schema Validation", () => {
  it("validates standard and new field types properly", () => {
    const validFields = [
      { id: "f_1", type: "text", label: "Short Text", required: true },
      { id: "f_2", type: "textarea", label: "Long Text", required: false },
      { id: "f_3", type: "phone", label: "WhatsApp", placeholder: "+62 812", required: true },
      { id: "f_4", type: "file", label: "Brief PDF", acceptFiles: ".pdf,.zip", required: false },
      { id: "f_5", type: "signature", label: "Signature", required: true },
      { id: "f_6", type: "rating", label: "Rating Scale", maxRating: 5, required: false },
      { id: "f_7", type: "heading", label: "Section 1", sublabel: "Please fill accurately", required: false },
    ];

    const parsed = safeParseQuestionnaireSchema(validFields);
    expect(parsed.length).toBe(7);
    expect(parsed.find((f) => f.type === "phone")?.label).toBe("WhatsApp");
    expect(parsed.find((f) => f.type === "file")?.acceptFiles).toBe(".pdf,.zip");
    expect(parsed.find((f) => f.type === "signature")?.required).toBe(true);
    expect(parsed.find((f) => f.type === "heading")?.sublabel).toBe("Please fill accurately");
  });
});
