export type RecoveryRequest = {
  createdAt: Date;
  coolingUntil: Date;
  approvals: readonly string[];
  requesterId: string;
  status: "pending" | "approved" | "rejected" | "expired";
};

export function canApproveRecovery(request: RecoveryRequest, adminId: string, now = new Date()) {
  return request.status === "pending" && now >= request.coolingUntil && adminId !== request.requesterId && !request.approvals.includes(adminId);
}

export function canExecuteRecovery(request: RecoveryRequest, now = new Date()) {
  return request.status === "pending" && now >= request.coolingUntil && request.approvals.length >= 2;
}

export function recoveryCoolingUntil(createdAt: Date) {
  return new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
}


export const MANUAL_RECOVERY_COOLING_HOURS = 72;
