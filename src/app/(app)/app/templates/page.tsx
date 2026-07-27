import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Layers, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { canAccessTemplatesPreview } from "@/lib/feature-access";
import { getCurrentLang, createT } from "@/lib/i18n";
import { TemplateCenterClient } from "@/components/template-center-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TemplateCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? "";
  const canPreview = canAccessTemplatesPreview(email);

  const params = await searchParams;
  const tab =
    params.tab === "contract" ||
    params.tab === "proposal" ||
    params.tab === "prompt" ||
    params.tab === "invoice"
      ? params.tab
      : "invoice";

  if (!canPreview) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-6">
        <div className="flex items-center gap-2">
          <h1 className="app-page-title">
            {t("Template", "Templates")}
          </h1>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Soon
          </Badge>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {t("Template Center segera hadir", "Template Center coming soon")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Fitur template invoice, kontrak, proposal, dan prompt masih disiapkan. Menu tetap kelihatan biar lo tau arah produknya.",
                  "Invoice, contract, proposal, and prompt templates are still being prepared. The menu stays visible so you know what's next.",
                )}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/app/dashboard">
                <Layers className="mr-1.5 h-4 w-4" />
                {t("Kembali ke Dashboard", "Back to Dashboard")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1 sm:p-0">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Soon
        </Badge>
        <p className="text-xs text-muted-foreground">
          {t(
            "Preview internal — user lain cuma lihat halaman Soon.",
            "Internal preview — other users only see the Soon page.",
          )}
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4 p-6">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
            <div className="h-10 w-80 animate-pulse rounded bg-muted" />
          </div>
        }
      >
        <TemplateCenterClient initialTab={tab} />
      </Suspense>
    </div>
  );
}
