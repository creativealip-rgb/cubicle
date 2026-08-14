import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const compose = readFileSync("docker-compose.yml", "utf8");
const composeDev = readFileSync("docker-compose.dev.yml", "utf8");
const envExample = readFileSync(".env.example", "utf8");

describe("config env wiring", () => {
  it("ships R2_PUBLIC_URL alias in compose and env example", () => {
    expect(compose).toContain("R2_PUBLIC_URL: ${R2_PUBLIC_URL:-}");
    // dev compose no longer pins R2 vars in environment: — they flow from the
    // env_file (.env.development.local), same pattern as CRON_SECRET.
    expect(composeDev).not.toContain("R2_PUBLIC_URL:");
    expect(envExample).toContain("R2_PUBLIC_URL");
  });

  it("preserves R2_PUBLIC_ENDPOINT for scripts/upload-logo.mjs", () => {
    expect(compose).toContain("R2_PUBLIC_ENDPOINT: ${R2_PUBLIC_ENDPOINT:-}");
    expect(composeDev).not.toContain("R2_PUBLIC_ENDPOINT:");
    expect(envExample).toContain("R2_PUBLIC_ENDPOINT");
  });

  it("removes dead OPENAI_BASE_URL and OPENAI_COMPATIBLE_* from compose", () => {
    expect(compose).not.toContain("OPENAI_BASE_URL");
    expect(compose).not.toContain("OPENAI_COMPATIBLE");
  });

  it("keeps live AI env wiring in compose", () => {
    expect(compose).toContain("OPENAI_API_KEY: ${OPENAI_API_KEY:-}");
    expect(compose).toContain("OPENAI_API_BASE: ${OPENAI_API_BASE:-}");
    expect(compose).toContain("AI_BASE_URL: ${AI_BASE_URL:-");
    expect(compose).toContain("AI_API_KEY: ${AI_API_KEY:-}");
  });

  it("aligns AI_MODEL default to ag/gemini-3-flash in both compose files", () => {
    expect(compose).toContain("AI_MODEL: ${AI_MODEL:-ag/gemini-3-flash}");
    expect(composeDev).toContain("AI_MODEL: ${AI_MODEL:-ag/gemini-3-flash}");
  });
});
