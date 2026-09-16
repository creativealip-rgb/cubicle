"use client";
import { useEffect, useRef } from "react";

export function AcquisitionTracker({ event = "landing_viewed" as "landing_viewed" | "signup_started" | "signup_completed", startOnInteraction = false }: { event?: "landing_viewed" | "signup_started" | "signup_completed"; startOnInteraction?: boolean }) {
  const sent = useRef(false);
  useEffect(() => {
    const send = () => { if (sent.current) return; sent.current = true; void fetch("/api/analytics/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventName: event, metadata: { landingPath: location.pathname, source: new URLSearchParams(location.search).get("utm_source") ?? undefined, medium: new URLSearchParams(location.search).get("utm_medium") ?? undefined, campaign: new URLSearchParams(location.search).get("utm_campaign") ?? undefined, term: new URLSearchParams(location.search).get("utm_term") ?? undefined, content: new URLSearchParams(location.search).get("utm_content") ?? undefined, referralId: new URLSearchParams(location.search).get("ref") ?? undefined, referrer: document.referrer ? new URL(document.referrer).hostname : undefined } }) }); };
    if (!startOnInteraction) send(); else { window.addEventListener("pointerdown", send, { once: true }); window.addEventListener("keydown", send, { once: true }); return () => { window.removeEventListener("pointerdown", send); window.removeEventListener("keydown", send); }; }
  }, [event, startOnInteraction]);
  return null;
}
export function SignupCompletedTracker() { return <AcquisitionTracker event="signup_completed" />; }
