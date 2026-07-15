"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy alias — sidebar uses /app/personal as Catatan. */
export default function NotesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/personal");
  }, [router]);
  return null;
}
