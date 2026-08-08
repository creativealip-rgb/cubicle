import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const editSource = readFileSync("src/app/(app)/app/questionnaires/[questionnaireId]/edit/page.tsx", "utf8");
const detailSource = readFileSync("src/app/(app)/app/questionnaires/[questionnaireId]/page.tsx", "utf8");
const actionsSource = readFileSync("src/lib/actions/questionnaires.ts", "utf8");

describe("questionnaire edit route", () => {
  it("routes to the edit page from the detail page for writable users", () => {
    expect(detailSource).toContain(`href={\`/app/questionnaires/\${q.id}/edit\`}`);
    expect(detailSource).toContain("canWrite");
  });

  it("gates the edit page on workspace writability, like the new page", () => {
    expect(editSource).toContain("requireWorkspaceWritableOrRedirect");
    expect(editSource).not.toContain("assertWorkspaceMember");
  });

  it("loads the questionnaire scoped to the current workspace", () => {
    expect(editSource).toContain("eq(questionnaires.id, questionnaireId)");
    expect(editSource).toContain("eq(questionnaires.workspaceId, workspaceId)");
  });

  it("renders the QuestionnaireBuilder with the questionnaire id for editing", () => {
    expect(editSource).toContain("QuestionnaireBuilder");
    expect(editSource).toContain("questionnaireId={q.id}");
  });

  it("uses the shared safe parser for corrupt JSONB schema instead of a bare cast", () => {
    expect(editSource).toContain("safeParseQuestionnaireSchema");
    expect(editSource).not.toContain("as Field[]");
    expect(detailSource).toContain("safeParseQuestionnaireSchema");
    expect(detailSource).not.toContain("as Field[]");
  });
});

describe("questionnaire edit action", () => {
  it("exports updateQuestionnaire", () => {
    expect(actionsSource).toMatch(/export async function updateQuestionnaire\b/);
  });

  it("requires a writable workspace membership before updating", () => {
    expect(actionsSource).toContain("assertWorkspaceWritable");
  });

  it("scopes the lookup and update to the current workspace", () => {
    expect(actionsSource).toContain("eq(questionnaires.id, questionnaireId)");
    expect(actionsSource).toContain("eq(questionnaires.workspaceId, workspaceId)");
  });

  it("rejects an empty schema on update", () => {
    expect(actionsSource).toContain(".min(1)");
  });

  it("uses the shared questionnaire schema for validation", () => {
    expect(actionsSource).toContain("@/lib/questionnaire-schema");
    expect(actionsSource).not.toContain("const fieldSchema");
  });

  it("uses the shared safe parser when reading stored schemas", () => {
    expect(actionsSource).toContain("safeParseQuestionnaireSchema");
    expect(actionsSource).not.toContain("as Array<z.infer<typeof fieldSchema>>");
  });

  it("logs an activity entry after updating", () => {
    expect(actionsSource).toContain('"updated_questionnaire"');
    expect(actionsSource).toContain("writeActivityLog");
  });
});
