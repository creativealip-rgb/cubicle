import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, users, workspaces } from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/access";

export type UploadQuotaLimits = {
  maxFileBytes: number;
  maxWorkspaceBytes: number;
  maxWorkspaceFiles: number;
  maxClientBytes: number;
  maxClientFiles: number;
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

export function getUploadQuotaLimits(plan: string): UploadQuotaLimits {
  if (plan === "team") return { maxFileBytes: 50 * MB, maxWorkspaceBytes: 25 * GB, maxWorkspaceFiles: 25_000, maxClientBytes: 5 * GB, maxClientFiles: 5_000 };
  if (plan === "solo") return { maxFileBytes: 25 * MB, maxWorkspaceBytes: 5 * GB, maxWorkspaceFiles: 5_000, maxClientBytes: 1 * GB, maxClientFiles: 1_000 };
  return { maxFileBytes: 5 * MB, maxWorkspaceBytes: 100 * MB, maxWorkspaceFiles: 100, maxClientBytes: 0, maxClientFiles: 0 };
}

export function checkUploadQuota(input: {
  incomingBytes: number;
  workspaceBytes: number;
  workspaceFiles: number;
  clientBytes: number;
  clientFiles: number;
  limits: UploadQuotaLimits;
}): { allowed: true } | { allowed: false; code: string } {
  const { incomingBytes, workspaceBytes, workspaceFiles, clientBytes, clientFiles, limits } = input;
  if (incomingBytes <= 0 || incomingBytes > limits.maxFileBytes) return { allowed: false, code: "FILE_SIZE_LIMIT" };
  if (workspaceBytes + incomingBytes > limits.maxWorkspaceBytes) return { allowed: false, code: "WORKSPACE_BYTES_LIMIT" };
  if (workspaceFiles + 1 > limits.maxWorkspaceFiles) return { allowed: false, code: "WORKSPACE_FILES_LIMIT" };
  if (limits.maxClientBytes > 0 && clientBytes + incomingBytes > limits.maxClientBytes) return { allowed: false, code: "CLIENT_BYTES_LIMIT" };
  if (limits.maxClientFiles > 0 && clientFiles + 1 > limits.maxClientFiles) return { allowed: false, code: "CLIENT_FILES_LIMIT" };
  return { allowed: true };
}

export class UploadQuotaError extends Error {
  constructor(public code: string) {
    super("Storage quota exceeded");
  }
}

export async function persistUploadedObject<T>(input: {
  storageKey: string;
  persist: () => Promise<T>;
  cleanup: (storageKey: string) => Promise<unknown>;
}): Promise<T> {
  try {
    return await input.persist();
  } catch (error) {
    await input.cleanup(input.storageKey).catch(() => undefined);
    throw error;
  }
}

export async function assertUploadQuota(workspaceId: string, incomingBytes: number, clientId?: string | null) {
  const [workspace] = await db.select({ plan: users.plan }).from(workspaces)
    .innerJoin(users, eq(users.id, workspaces.ownerId)).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new ForbiddenError("Workspace not found");
  const [usage] = await db.select({
    bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::bigint`,
    count: sql<number>`count(*)::int`,
  }).from(files).where(eq(files.workspaceId, workspaceId));
  const [clientUsage] = clientId ? await db.select({
    bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::bigint`,
    count: sql<number>`count(*)::int`,
  }).from(files).where(and(eq(files.workspaceId, workspaceId), eq(files.clientId, clientId))) : [{ bytes: 0, count: 0 }];
  const result = checkUploadQuota({
    incomingBytes,
    workspaceBytes: Number(usage?.bytes ?? 0),
    workspaceFiles: Number(usage?.count ?? 0),
    clientBytes: Number(clientUsage?.bytes ?? 0),
    clientFiles: Number(clientUsage?.count ?? 0),
    limits: getUploadQuotaLimits(workspace.plan ?? "free"),
  });
  if (!result.allowed) throw new UploadQuotaError(result.code);
}

export function validateContentLength(value: string | null, maxFileBytes: number) {
  if (!value) return true;
  const length = Number(value);
  return Number.isFinite(length) && length > 0 && length <= maxFileBytes;
}

export function safeUploadErrorResponse(error: unknown): { error: string; status: number } {
  if (error instanceof UploadQuotaError) return { error: "Storage quota exceeded", status: 413 };
  if (error instanceof UnauthorizedError) return { error: "Unauthorized", status: 401 };
  if (error instanceof ForbiddenError) return { error: "Forbidden", status: 403 };
  return { error: "Upload failed", status: 500 };
}

export function validateSignatureDataUrl(value: string): { ok: true } | { ok: false; reason: string } {
  if (value.length > 700 * 1024) return { ok: false, reason: "Signature image must be under 512KB" };
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return { ok: false, reason: "Signature format must be PNG, JPEG, or WebP" };
  const decoded = Buffer.from(match[2], "base64");
  if (decoded.length > 512 * 1024) return { ok: false, reason: "Signature image must be under 512KB" };
  const png = decoded.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const jpeg = decoded[0] === 0xff && decoded[1] === 0xd8 && decoded[2] === 0xff;
  const webp = decoded.subarray(0, 4).toString() === "RIFF" && decoded.subarray(8, 12).toString() === "WEBP";
  if ((match[1] === "png" && !png) || (match[1] === "jpeg" && !jpeg) || (match[1] === "webp" && !webp)) return { ok: false, reason: "Signature content does not match format" };
  return { ok: true };
}
