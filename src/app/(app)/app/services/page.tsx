"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ServicesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/app/tasks"); }, [router]);
  return <p className="p-6 text-sm text-muted-foreground">Katalog Layanan sudah dipensiunkan. <Link className="underline" href="/app/tasks">Buka Tugas</Link>.</p>;
}
