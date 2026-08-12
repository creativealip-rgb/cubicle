"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { createClientFromSignedContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

/**
 * Post-sign notification shown on the authenticated contract detail page
 * when a signed contract has no linked Client yet.
 *
 * `Tambah client` creates the Client from the contract recipient snapshot via
 * the workspace/auth-protected server action (signed-only, scoped, idempotent).
 * `Nanti` dismisses the banner for the current page session only — no schema
 * change, and the banner reappears on next visit until a Client is linked.
 *
 * This component is intentionally only imported by the contract detail page;
 * proposal acceptance must never render it.
 */
export function PostSignClientBanner({ contractId }: { contractId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  if (dismissed) return null;

  async function handleAddClient() {
    setLoading(true);
    try {
      const result = await createClientFromSignedContract(contractId);
      setCreatedClientId(result.clientId);
      toast.success(
        t("Client dibuat dari data kontrak.", "Client created from contract data."),
      );
      // Server action revalidated the contract page; refresh so the header
      // shows the linked client and the banner disappears server-side too.
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("Gagal membuat client", "Failed to create client");
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("Kontrak telah ditandatangani", "Contract has been signed")}
          </p>
          <p className="text-xs text-emerald-700/80">
            {t(
              "Simpan data klien ini sebagai client di workspace?",
              "Save this recipient as a client in the workspace?",
            )}
          </p>
        </div>
        {createdClientId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/clients/${createdClientId}`}>
              {t("Buka client", "Open client")}
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <LoadingButton
              type="button"
              size="sm"
              onClick={handleAddClient}
              loading={loading}
              loadingText={t("Membuat...", "Creating...")}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              {t("Tambah client", "Add client")}
            </LoadingButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              disabled={loading}
            >
              {t("Nanti", "Later")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
