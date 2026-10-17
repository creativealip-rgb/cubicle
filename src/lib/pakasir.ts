import { timingSafeEqual } from "node:crypto";

const PAKASIR_BASE_URL = "https://app.pakasir.com";
const USER_AGENT = "Cubiqlo/1.0 (+https://cubiqlo.com)";

export type PakasirPayment = {
  txn_id: string;
  project: string;
  order_id: string;
  amount: number;
  fee?: number;
  total_payment?: number;
  payment_method: string;
  qr_string?: string;
  va_number?: string;
  expired_at?: string;
  is_sandbox?: boolean;
};

export type PakasirWebhook = {
  txn_id: string;
  amount: number;
  order_id: string;
  status: "pending" | "completed" | "canceled";
  completed_at?: string;
  is_sandbox?: boolean;
  expired_at?: string;
};

function config() {
  const project = process.env.PAKASIR_PROJECT;
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!project || !apiKey) return null;
  return { project, apiKey };
}

async function pakasirRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("PAKASIR_PROJECT/PAKASIR_API_KEY not configured");
  const response = await fetch(`${PAKASIR_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT,
      "X-Api-Key": cfg.apiKey,
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* handled below */ }
  if (!response.ok || json === null) {
    throw new Error(`Pakasir HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return json as T;
}

export function isPakasirConfigured() {
  return Boolean(config());
}

export function pakasirProject() {
  return config()?.project ?? null;
}

export async function createPakasirTransaction(params: { orderId: string; amount: number; method?: string }) {
  const cfg = config();
  if (!cfg) throw new Error("PAKASIR_PROJECT/PAKASIR_API_KEY not configured");
  const response = await pakasirRequest<Omit<PakasirPayment, "project">>(
    `/api/v2/create-transaction/${encodeURIComponent(cfg.project)}/${encodeURIComponent(params.orderId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: params.method ?? "qris", amount: params.amount }),
    },
  );
  return { ...response, project: cfg.project };
}

export async function getPakasirTransactionDetail(params: { txnId: string }) {
  const cfg = config();
  if (!cfg) throw new Error("PAKASIR_PROJECT/PAKASIR_API_KEY not configured");
  const transaction = await pakasirRequest<PakasirWebhook>(
    `/api/v2/transaction-status/${encodeURIComponent(cfg.project)}/${encodeURIComponent(params.txnId)}`,
  );
  return { transaction };
}

export function pakasirTxnId(rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const txnId = (rawPayload as Record<string, unknown>).txn_id;
  return typeof txnId === "string" && txnId.trim() ? txnId.trim() : null;
}

export function verifyPakasirWebhookSecret(value: string | null): boolean {
  const expected = process.env.PAKASIR_WEBHOOK_SECRET;
  // Provider status is still re-fetched fail-closed. Set this env to additionally
  // enforce Pakasir's X-Secret after configuring the same value in its dashboard.
  if (!expected) return true;
  if (!value || expected.length !== value.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function pakasirPaymentUrl(params: { txnId: string; redirectUrl?: string }) {
  const qs = new URLSearchParams();
  qs.set("qris_only", "1");
  if (params.redirectUrl) qs.set("redirect", params.redirectUrl);
  return `${PAKASIR_BASE_URL}/pay-v2/${encodeURIComponent(params.txnId)}?${qs}`;
}
