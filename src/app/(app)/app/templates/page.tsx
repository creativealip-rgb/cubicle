import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Mail, Receipt, FileSignature, ClipboardList } from "lucide-react";

const templateGroups = [
  {
    title: "Invoice Templates",
    description: "Reusable invoice layout, terms, tax notes, and payment copy.",
    href: "/app/invoice-templates",
    icon: Receipt,
    status: "Manager ready",
  },
  {
    title: "Email Templates",
    description: "Client update, invoice follow-up, onboarding, and reminder messages.",
    href: "/app/email",
    icon: Mail,
    status: "Ready",
  },
  {
    title: "Contract Templates",
    description: "Scope, terms, signature blocks, and reusable legal templates.",
    href: "/app/contract-templates",
    icon: FileSignature,
    status: "Ready",
  },
  {
    title: "Proposal Templates",
    description: "Scope proposal structures and pricing blocks for new clients.",
    href: "/app/proposals/new",
    icon: FileText,
    status: "Use proposal builder",
  },
  {
    title: "Form Templates",
    description: "Client intake, questionnaire, and project requirement forms.",
    href: "/app/questionnaires",
    icon: ClipboardList,
    status: "Ready",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Satu tempat untuk semua template: invoice, email, kontrak, proposal, dan formulir.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templateGroups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" /> {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{group.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{group.status}</span>
                  <Button size="sm" asChild><Link href={group.href}>Open</Link></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
