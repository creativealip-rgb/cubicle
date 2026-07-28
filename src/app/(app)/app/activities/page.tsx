"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ActivitiesCompatibilityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/time/activities");
  }, [router]);

  return null;
}
