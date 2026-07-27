"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardGreetingProps = {
  firstName: string;
  lang: "id" | "en";
};

const TIME_ZONE = "Asia/Jakarta";

function getZonedHour(date: Date) {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  return Number(hourPart ?? date.getHours());
}

function getGreeting(date: Date, lang: "id" | "en") {
  const hour = getZonedHour(date);
  if (lang === "id") {
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  }
  if (hour < 11) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting({ firstName, lang }: DashboardGreetingProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const locale = lang === "id" ? "id-ID" : "en-US";
  const greeting = getGreeting(now, lang);
  const todayLong = useMemo(
    () =>
      now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: TIME_ZONE,
      }),
    [locale, now],
  );

  return (
    <div className="space-y-2.5">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950">
        {greeting}, {firstName}
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">{todayLong}</p>
    </div>
  );
}
