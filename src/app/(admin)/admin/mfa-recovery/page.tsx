import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MfaRecoveryActions } from "@/components/admin/mfa-recovery-actions";
import { listPendingMfaRecoveries } from "@/lib/actions/admin/mfa-recovery";

export const dynamic = "force-dynamic";

export default async function MfaRecoveryPage() {
  const rows = await listPendingMfaRecoveries();
  const now = Date.now();
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">MFA recovery</h1><p className="text-sm text-muted-foreground">72-hour cooling period and two distinct admin approvals required.</p></div>
    <Card><CardHeader><CardTitle className="text-base">Pending requests</CardTitle></CardHeader><CardContent className="p-0"><Table>
      <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Reason</TableHead><TableHead>Cooling</TableHead><TableHead>Approvals</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((row) => { const ready = row.coolingUntil.getTime() <= now; return <TableRow key={row.id}>
        <TableCell><div>{row.email}</div><div className="text-xs text-muted-foreground">{row.userId}</div></TableCell>
        <TableCell className="max-w-xs whitespace-normal">{row.reason}</TableCell>
        <TableCell><Badge variant={ready ? "success" : "warning"}>{ready ? "Ready" : row.coolingUntil.toLocaleString()}</Badge></TableCell>
        <TableCell>{row.approvals}/2</TableCell>
        <TableCell><MfaRecoveryActions requestId={row.id} ready={ready} approvals={row.approvals} /></TableCell>
      </TableRow>; })}{rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No pending requests.</TableCell></TableRow>}</TableBody>
    </Table></CardContent></Card>
  </div>;
}
