import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const templates = [
  { name: "Standard Service Invoice", terms: "Payment due within 14 days.", notes: "Thank you for your business." },
  { name: "Milestone Invoice", terms: "Due on milestone approval.", notes: "This invoice covers approved milestone work." },
  { name: "Retainer Invoice", terms: "Monthly retainer, due on receipt.", notes: "Recurring monthly service retainer." },
];

export default function InvoiceTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Template Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">Starter manager untuk template terms, notes, dan invoice workflow.</p>
        </div>
        <Button asChild><Link href="/app/invoices/new">Create invoice</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((tpl) => (
          <Card key={tpl.name}>
            <CardHeader><CardTitle className="text-base">{tpl.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Terms:</strong> {tpl.terms}</p>
              <p><strong className="text-foreground">Notes:</strong> {tpl.notes}</p>
              <Button size="sm" variant="outline" asChild><Link href="/app/invoices/new">Use template</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
