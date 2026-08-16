// Admin control-plane shared schemas & types.
// NOT a "use server" file — imported by server actions AND client components
// (Next forbids non-async exports from "use server" files).

import { z } from "zod";

export const PLAN_VALUES = ["free", "solo", "team"] as const;
export const ROLE_VALUES = ["user", "admin"] as const;

export type AdminActionResult = { ok: true } | { ok: false; error: string };

export const listUsersSchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  plan: z.enum(PLAN_VALUES).optional(),
  banned: z.boolean().optional(),
  verified: z.boolean().optional(),
  role: z.enum(ROLE_VALUES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type AdminListUserRow = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  banned: boolean;
  plan: string;
  planExpiresAt: Date | null;
  createdAt: Date;
  workspaceCount: number;
};

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  verified: z.boolean().default(true),
  plan: z.enum(PLAN_VALUES).default("free"),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  emailVerified: z.boolean(),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const banUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(500).optional().default(""),
});

export const unbanUserSchema = z.object({
  userId: z.string().min(1),
});

export const changeUserPlanSchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(PLAN_VALUES),
  planExpiresAt: z.string().datetime().nullable().optional().default(null),
  reason: z.string().trim().min(1).max(500),
});

export const listWorkspacesSchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const listPaymentsSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "expired"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  action: z.string().trim().max(60).optional(),
});
