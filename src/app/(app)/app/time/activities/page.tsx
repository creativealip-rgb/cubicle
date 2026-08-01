"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TimeActivitiesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app/time"); }, [router]);
  return <p className="p-6 text-sm text-muted-foreground">Katalog Aktivitas sudah dipindahkan. <Link className="underline" href="/app/time">Buka Waktu</Link>.</p>;
}
