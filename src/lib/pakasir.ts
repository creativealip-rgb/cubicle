const PAKASIR_BASE_URL = "https://app.pakasir.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

export type PakasirPayment = {
  project: string;
  order_id: string;
  amount: number;
  fee?: number;
  total_payment?: number;
  received?: number;
  payment_method: string;
  payment_number: string;
  expired_at?: string;
};

export type PakasirWebhook = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method?: string;
  completed_at?: string;
};

function config() {
  const project = process.env.PAKASIR_PROJECT;
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!project || !apiKey) return null;
  return { project, apiKey };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PAKASIR_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/plain, */*",
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
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

export async function createPakasirTransaction(params: {
  orderId: string;
  amount: number;
  method?: string;
}) {
  const cfg = config();
  if (!cfg) throw new Error("PAKASIR_PROJECT/PAKASIR_API_KEY not configured");
  const data = await postJson<{ payment: PakasirPayment }>(
    `/api/transactioncreate/${params.method ?? "qris"}`,
    {
      project: cfg.project,
      order_id: params.orderId,
      amount: params.amount,
      api_key: cfg.apiKey,
    },
  );
  return data.payment;
}

export async function getPakasirTransactionDetail(params: {
  orderId: string;
  amount: number;
}) {
  const cfg = config();
  if (!cfg) throw new Error("PAKASIR_PROJECT/PAKASIR_API_KEY not configured");
  const qs = new URLSearchParams({
    project: cfg.project,
    amount: String(params.amount),
    order_id: params.orderId,
    api_key: cfg.apiKey,
  });
  const response = await fetch(`${PAKASIR_BASE_URL}/api/transactiondetail?${qs}`, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    cache: "no-store",
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Pakasir detail HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return json as { transaction?: PakasirWebhook };
}

export function pakasirPaymentUrl(params: { project: string; amount: number; orderId: string; redirectUrl?: string }) {
  const qs = new URLSearchParams({ order_id: params.orderId, qris_only: "1" });
  if (params.redirectUrl) qs.set("redirect", params.redirectUrl);
  return `${PAKASIR_BASE_URL}/pay/${params.project}/${params.amount}?${qs}`;
}
