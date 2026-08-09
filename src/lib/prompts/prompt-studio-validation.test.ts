import { describe, expect, it } from "vitest";
import { validateField, hasEnteredDetails, type PromptStudioFormState } from "./prompt-studio-validation";

const text = { key: "topic", label: "Topik", type: "text", required: true } as const;
const numberField = { key: "slideCount", label: "Jumlah slide", type: "number", required: true, min: 3, max: 10 } as const;
const select = { key: "interactionType", label: "Interaksi", type: "select", required: true, options: ["poll", "question", "quiz", "none"] } as const;
const optionalSelect = { key: "rating", label: "Rating", type: "select", options: ["1", "2", "3", "4", "5"] } as const;

describe("validateField", () => {
  it("flags missing required fields", () => {
    expect(validateField(text, undefined, "id")).toContain("wajib");
    expect(validateField(text, "", "en")).toBe("Topik is required");
  });

  it("accepts present values for required fields", () => {
    expect(validateField(text, "AI Marketing", "id")).toBeNull();
  });

  it("validates number min/max and NaN", () => {
    expect(validateField(numberField, 2, "id")).toBe("Minimal 3");
    expect(validateField(numberField, 11, "en")).toBe("Maximum 10");
    expect(validateField(numberField, NaN, "id")).toBe("Harus berupa angka");
    expect(validateField(numberField, 5, "id")).toBeNull();
  });

  it("validates select membership, including optional selects", () => {
    expect(validateField(select, "bogus", "id")).toBe("Pilihan tidak valid");
    expect(validateField(select, "quiz", "en")).toBeNull();
    expect(validateField(optionalSelect, "6", "id")).toBe("Pilihan tidak valid");
    expect(validateField(optionalSelect, "5", "id")).toBeNull();
    expect(validateField(optionalSelect, undefined, "id")).toBeNull();
  });
});

describe("hasEnteredDetails", () => {
  const emptyState: PromptStudioFormState = {
    brand: "", campaign: "", goal: "", audience: "",
    offer: "", tone: "", style: "", platform: "", ratio: "",
    colorPalette: "", notes: "", options: {},
  };

  it("returns false for a pristine form", () => {
    expect(hasEnteredDetails(emptyState)).toBe(false);
  });

  it("detects any core brief field", () => {
    expect(hasEnteredDetails({ ...emptyState, brand: "Cubiqlo" })).toBe(true);
    expect(hasEnteredDetails({ ...emptyState, notes: "segera" })).toBe(true);
    expect(hasEnteredDetails({ ...emptyState, tone: "Friendly" })).toBe(true);
  });

  it("detects any type-specific option value", () => {
    expect(hasEnteredDetails({ ...emptyState, options: { duration: "30s" } })).toBe(true);
    expect(hasEnteredDetails({ ...emptyState, options: { frameCount: 3 } })).toBe(true);
  });
});
