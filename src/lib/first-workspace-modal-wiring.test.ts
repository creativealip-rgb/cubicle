import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/app/(app)/app/dashboard/page.tsx", "utf8");
const layout = readFileSync("src/app/(app)/layout.tsx", "utf8");
const workspace = readFileSync("src/lib/workspace.ts", "utf8");
const onboarding = readFileSync("src/lib/actions/onboarding.ts", "utf8");
const modal = readFileSync("src/components/first-workspace-modal.tsx", "utf8");

it("checks for an existing workspace without auto-creating one", () => {
  expect(workspace).toContain("findWorkspaceFullForCurrentUser");
  expect(dashboard).toContain("await findWorkspaceFullForCurrentUser()");
  expect(layout).toContain("await findWorkspaceFullForCurrentUser()");
  expect(layout).not.toContain("getWorkspaceForCurrentUser");
  expect(dashboard).toContain("<FirstWorkspaceModal");
});

it("creates the first workspace only after modal submission", () => {
  expect(onboarding).toContain("createWorkspaceForUser(user.id, parsed.businessName)");
  expect(workspace).toContain("workspaceName?.trim()");
  expect(modal).toContain("finishOnboarding({");
});

it("renders a locked 3-step modal over a dashboard backdrop", () => {
  expect(modal).toContain("open={true}");
  expect(modal).toContain("onEscapeKeyDown={(event) => event.preventDefault()}");
  expect(modal).toContain("onPointerDownOutside={(event) => event.preventDefault()}");
  expect(modal).toContain('t("Pilih tipe akun", "Choose account type")');
  expect(modal).toContain('t("Tau Cubiqlo dari mana?", "Where did you hear about Cubiqlo?")');
  expect(modal).toContain('t("Lanjut setup account di Settings", "Continue');
});
