import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nextConfig = readFileSync("next.config.ts", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");

 describe("deployment version skew protection", () => {
  it("uses the immutable source revision as Next deployment ID", () => {
    expect(nextConfig).toContain("deploymentId: process.env.NEXT_DEPLOYMENT_ID");
    expect(dockerfile).toContain("ARG VCS_REF=unknown");
    expect(dockerfile).toContain("ENV NEXT_DEPLOYMENT_ID=$VCS_REF");
  });
});
