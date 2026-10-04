"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/lib/i18n-client";

export default function TimeActivitiesPage() {
  const { t } = useT();
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/time");
  }, [router]);

  return (
    <p className="p-6 text-sm text-muted-foreground">
      {t("Katalog Aktivitas sudah dipindahkan.", "Activity Catalog has been moved.")}{" "}
      <Link className="underline" href="/app/time">
        {t("Buka Waktu", "Open Time")}
      </Link>.
    </p>
  );
}
