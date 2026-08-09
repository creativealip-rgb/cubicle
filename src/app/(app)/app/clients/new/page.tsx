import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/forms/client-form";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function NewClientPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link href="/app/clients">
          <ArrowLeft className="h-4 w-4" />
          {t("Kembali ke Klien", "Back to Clients")}
        </Link>
      </Button>

      <div>
        <h1 className="app-page-title">{t("Klien Baru", "New Client")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Simpan data klien, perusahaan, dan kontak untuk project & invoice.",
            "Save client, company, and contact details for projects & invoices.",
          )}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ClientForm mode="create" redirectTo="/app/clients" />
        </CardContent>
      </Card>
    </div>
  );
}
