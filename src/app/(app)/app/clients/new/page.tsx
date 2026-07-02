import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/forms/client-form";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link href="/app/clients">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Klien
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Klien Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm mode="create" redirectTo="/app/clients" />
        </CardContent>
      </Card>
    </div>
  );
}
