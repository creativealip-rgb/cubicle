type EnvCheck = {
  name: string;
  requiredInProduction: boolean;
  configured: boolean;
  note: string;
};

const envSpec: Array<Omit<EnvCheck, "configured">> = [
  { name: "DATABASE_URL", requiredInProduction: true, note: "PostgreSQL connection string" },
  { name: "BETTER_AUTH_SECRET", requiredInProduction: true, note: "Better-Auth session signing secret" },
  { name: "BETTER_AUTH_URL", requiredInProduction: true, note: "Canonical auth/app origin" },
  { name: "NEXT_PUBLIC_APP_URL", requiredInProduction: true, note: "Public app origin used for generated links" },
  { name: "CRON_SECRET", requiredInProduction: true, note: "Bearer secret for cron endpoints" },
  { name: "R2_ACCOUNT_ID", requiredInProduction: true, note: "Cloudflare R2 account" },
  { name: "R2_ACCESS_KEY_ID", requiredInProduction: true, note: "Cloudflare R2 access key" },
  { name: "R2_SECRET_ACCESS_KEY", requiredInProduction: true, note: "Cloudflare R2 secret key" },
  { name: "R2_BUCKET_NAME", requiredInProduction: true, note: "Cloudflare R2 bucket" },
  { name: "RESEND_API_KEY", requiredInProduction: true, note: "Transactional email provider" },
  { name: "EMAIL_FROM", requiredInProduction: true, note: "Verified sender address" },
  { name: "PAKASIR_PROJECT", requiredInProduction: true, note: "Pakasir project slug" },
  { name: "PAKASIR_API_KEY", requiredInProduction: true, note: "Pakasir API key" },
  { name: "AI_API_KEY", requiredInProduction: false, note: "AI Assistant key; optional if Docker secret is mounted" },
  { name: "AI_BASE_URL", requiredInProduction: false, note: "AI Assistant OpenAI-compatible endpoint" },
  { name: "AI_MODEL", requiredInProduction: false, note: "AI Assistant model" },
  { name: "AI_MONTHLY_CAP_USD", requiredInProduction: false, note: "AI spend guardrail" },
];

function hasValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function getEnvChecks(): EnvCheck[] {
  return envSpec.map((item) => ({
    ...item,
    configured: hasValue(item.name),
  }));
}

export function getProductionEnvReport() {
  const checks = getEnvChecks();
  const missingRequired = checks.filter((check) => check.requiredInProduction && !check.configured);
  return {
    ok: missingRequired.length === 0,
    nodeEnv: process.env.NODE_ENV ?? "development",
    missingRequired: missingRequired.map((check) => check.name),
    checks,
  };
}
