import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageSquare, BookOpen, Bug } from "lucide-react";

const items = [
  { title: "Getting Started", icon: BookOpen, body: "Setup workspace, invite team, add clients, and create first project." },
  { title: "Report a Bug", icon: Bug, body: "Track UI issues, broken flows, or data problems for follow-up." },
  { title: "Contact Support", icon: Mail, body: "Send support request with workspace context and reply email." },
  { title: "Client Portal Help", icon: MessageSquare, body: "Guide clients to upload files, comment, approve, and view invoice links." },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bantuan cepat untuk workspace, client portal, invoice, dan workflow Cubiqlo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" /> {item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <Button variant="outline" size="sm">Open</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="h-4 w-4" /> Quick FAQ</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Client portal link:</strong> buka detail client, set portal slug, lalu copy short link.</p>
          <p><strong className="text-foreground">Invoice email:</strong> buka invoice detail lalu klik Send invoice.</p>
          <p><strong className="text-foreground">Timesheet export:</strong> buka Time Tracking lalu pilih Export CSV atau Export PDF.</p>
        </CardContent>
      </Card>
    </div>
  );
}
