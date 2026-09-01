"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decideMfaRecovery, executeMfaRecovery } from "@/lib/actions/admin/mfa-recovery";

export function MfaRecoveryActions({ requestId, ready, approvals }: { requestId: string; ready: boolean; approvals: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run(action: "approve" | "reject" | "execute") {
    setLoading(true); setError("");
    try {
      if (action === "execute") await executeMfaRecovery(requestId);
      else await decideMfaRecovery({ requestId, decision: action === "approve" ? "approved" : "rejected" });
      router.refresh();
    } catch { setError("Recovery action failed"); }
    finally { setLoading(false); }
  }
  return <div className="flex flex-wrap justify-end gap-2">
    {error && <p role="alert" className="w-full text-xs text-destructive">{error}</p>}
    <Button size="sm" variant="outline" disabled={loading || !ready} onClick={() => run("approve")}>Approve</Button>
    <Button size="sm" variant="destructive" disabled={loading} onClick={() => run("reject")}>Reject</Button>
    <Button size="sm" disabled={loading || !ready || approvals < 2} onClick={() => run("execute")}>Execute</Button>
  </div>;
}
