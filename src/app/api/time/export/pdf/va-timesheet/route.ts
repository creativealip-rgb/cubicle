import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { clients, projects, packages, tasks, timeEntries, users } from "@/db/schema";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";
import { and, asc, eq, gte, lte } from "drizzle-orm";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// H:MM:00 (Clockify style)
function formatHours(minutes: number | null): string {
  const m = Math.max(0, minutes ?? 0);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h}:${String(mins).padStart(2, "0")}:00`;
}

function formatTime(d: Date | string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDateShort(d: Date | string, locale: string): string {
  return new Date(d).toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Clockify-ish palette: greens + cyan + fallbacks
const DONUT_COLORS = [
  "#8bc34a", // light green
  "#33691e", // dark green
  "#26c6da", // cyan
  "#ffb74d", // orange
  "#7e57c2", // purple
  "#ef5350", // red
  "#26a69a", // teal
  "#ec407a", // pink
  "#5c6bc0", // indigo
  "#9ccc65", // lime
];

type Slice = { label: string; minutes: number };

/**
 * Build an inline SVG donut chart + legend from slices.
 * Uses stroke-dasharray on stacked circles — no JS/canvas needed for print.
 */
function donutChart(title: string, slices: Slice[]): string {
  const total = slices.reduce((s, x) => s + x.minutes, 0);
  if (total === 0) {
    return `<div class="donut-block"><div class="donut-title">${escapeHtml(title)}</div><div class="muted" style="padding:16px 0;">—</div></div>`;
  }
  const sorted = [...slices].sort((a, b) => b.minutes - a.minutes);

  const size = 150;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAccum = 0;
  const segments = sorted
    .map((slice, i) => {
      const frac = slice.minutes / total;
      const dash = frac * circumference;
      const gap = circumference - dash;
      const color = DONUT_COLORS[i % DONUT_COLORS.length];
      const seg = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offsetAccum}" transform="rotate(-90 ${cx} ${cy})" />`;
      offsetAccum += dash;
      return seg;
    })
    .join("");

  const legend = sorted
    .map((slice, i) => {
      const pct = Math.round((slice.minutes / total) * 100);
      const color = DONUT_COLORS[i % DONUT_COLORS.length];
      return `<div class="legend-row"><span class="legend-swatch" style="background:${color};"></span><span class="legend-label">${escapeHtml(slice.label)}</span><span class="legend-pct">${pct}%</span></div>`;
    })
    .join("");

  return `<div class="donut-block">
    <div class="donut-title">${escapeHtml(title)}</div>
    <div class="donut-chart-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#eef0f2" stroke-width="${stroke}" />
        ${segments}
      </svg>
    </div>
    <div class="legend">${legend}</div>
  </div>`;
}

// Render description into a numbered "Duties" block, Clockify-style.
function renderDuties(description: string | null, dutiesLabel: string): string {
  if (!description || !description.trim()) return "";
  const lines = description
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  const items = lines
    .map((l, i) => `<div class="duty-item">${i + 1}. ${escapeHtml(l)}</div>`)
    .join("");
  return `<tr class="duties-row"><td colspan="7"><div class="duties"><span class="duties-label">${escapeHtml(dutiesLabel)}</span>${items}</div></td></tr>`;
}

type BillingType = "project" | "hours" | "package";

type Entry = {
  date: Date | null;
  client: string | null;
  projectId: string | null;
  project: string | null;
  task: string | null;
  tags: string | null;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  billable: boolean | null;
  hourlyRate: string | null;
  billingType: BillingType | null;
  projectRate: string | null;
  projectCurrency: string | null;
  packageHours: number | null;
  packagePrice: string | null;
  user: string | null;
};

// Currency-aware money formatter. IDR = no decimals, others = 2 decimals.
function formatMoney(amount: number, currency: string | null): string {
  const cur = (currency || "IDR").toUpperCase();
  const localeMap: Record<string, string> = { IDR: "id-ID", USD: "en-US", EUR: "de-DE" };
  try {
    return new Intl.NumberFormat(localeMap[cur] || "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "IDR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
}

// Per-entry billable amount, billing-type aware.
// - hours/package: (minutes/60) × effective rate (entry rate overrides project rate)
// - project (flat fee): 0 per entry — the flat fee is shown once at project level
function entryAmount(e: Entry): number {
  if (!e.billable) return 0;
  const minutes = Number(e.durationMinutes ?? 0);
  const bt = e.billingType ?? "hours";
  if (bt === "project") return 0;
  const rate = Number(e.hourlyRate ?? e.projectRate ?? 0);
  return (minutes / 60) * rate;
}

// Sum billable amounts grouped by currency → e.g. { USD: 450, IDR: 2000000 }
function sumByCurrency(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    const amt = entryAmount(e);
    if (amt === 0) continue;
    const cur = (e.projectCurrency || "IDR").toUpperCase();
    m.set(cur, (m.get(cur) ?? 0) + amt);
  }
  return m;
}

// Render a currency map as "USD 450.00 + Rp 2.000.000" (or "—" if empty)
function renderMoneyMap(m: Map<string, number>): string {
  if (m.size === 0) return "—";
  return Array.from(m.entries())
    .map(([cur, amt]) => formatMoney(amt, cur))
    .join(" + ");
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = requireUser(session.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const cookieStore = await cookies();
  const lang = (cookieStore.get("cubiqlo_lang")?.value === "en" ? "en" : "id") as "id" | "en";
  const locale = lang === "en" ? "en-US" : "id-ID";

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");
  const clientId = url.searchParams.get("clientId");
  const projectId = url.searchParams.get("projectId");

  // report=detailed | dashboard | full (default: full)
  const reportParam = (url.searchParams.get("report") || "full").toLowerCase();
  const showDetailed = reportParam === "detailed" || reportParam === "full";
  const showDashboard = reportParam === "dashboard" || reportParam === "full";

  const conditions = [eq(timeEntries.workspaceId, workspaceId)];
  if (dateFrom) conditions.push(gte(timeEntries.startTime, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(timeEntries.startTime, new Date(dateTo + "T23:59:59")));
  if (clientId) conditions.push(eq(timeEntries.clientId, clientId));
  if (projectId) conditions.push(eq(timeEntries.projectId, projectId));

  const entries: Entry[] = await db
    .select({
      date: timeEntries.startTime,
      client: clients.name,
      projectId: timeEntries.projectId,
      project: projects.name,
      task: tasks.title,
      tags: timeEntries.tags,
      description: timeEntries.description,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      billingType: projects.billingType,
      projectRate: projects.rate,
      projectCurrency: projects.currency,
      packageHours: packages.hours,
      packagePrice: packages.price,
      user: users.name,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(packages, eq(packages.id, projects.selectedPackageId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(...conditions))
    .orderBy(asc(timeEntries.startTime))
    .limit(1000);

  // Totals
  const totalMinutes = entries.reduce((s, e) => s + Number(e.durationMinutes ?? 0), 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.durationMinutes ?? 0), 0);
  // Time-based billable amounts (hours/package), grouped by currency.
  const totalByCurrency = sumByCurrency(entries);
  // Flat-fee (billingType=project) amounts, one fee per distinct project, by currency.
  const flatFeeSeen = new Set<string>();
  const flatFeeByCurrency = new Map<string, number>();
  for (const e of entries) {
    if ((e.billingType ?? "hours") !== "project") continue;
    if (!e.projectId || flatFeeSeen.has(e.projectId)) continue;
    flatFeeSeen.add(e.projectId);
    const fee = Number(e.projectRate ?? 0);
    if (fee <= 0) continue;
    const cur = (e.projectCurrency || "IDR").toUpperCase();
    flatFeeByCurrency.set(cur, (flatFeeByCurrency.get(cur) ?? 0) + fee);
  }
  // Grand total = time-based + flat fees, merged by currency.
  const grandTotalByCurrency = new Map<string, number>(totalByCurrency);
  for (const [cur, amt] of flatFeeByCurrency) {
    grandTotalByCurrency.set(cur, (grandTotalByCurrency.get(cur) ?? 0) + amt);
  }

  const timeFrame = dateFrom && dateTo
    ? `${formatDateShort(dateFrom, locale)} - ${formatDateShort(dateTo, locale)}`
    : lang === "en" ? "All time" : "Semua waktu";

  // i18n labels
  const L = {
    detailedReport: lang === "en" ? "DETAILED REPORT" : "LAPORAN DETAIL",
    dashboardReport: lang === "en" ? "DASHBOARD REPORT" : "LAPORAN DASHBOARD",
    timeFrame: lang === "en" ? "Time frame" : "Rentang waktu",
    totalBillableAmount: lang === "en" ? "Total billable amount" : "Total jumlah tagihan",
    hrsOnly: lang === "en" ? "(hrs only)" : "(jam saja)",
    totalHours: lang === "en" ? "Total hours" : "Total jam",
    billableHours: lang === "en" ? "Billable hours" : "Jam tagihkan",
    day: lang === "en" ? "DAY" : "HARI",
    userCol: lang === "en" ? "USER" : "USER",
    project: lang === "en" ? "PROJECT" : "PROYEK",
    task: lang === "en" ? "TASK" : "TUGAS",
    tags: lang === "en" ? "TAGS" : "TAG",
    billableAmount: lang === "en" ? "BILLABLE AMOUNT" : "JUMLAH TAGIHAN",
    startFinish: lang === "en" ? "START/FINISH TIME" : "MULAI/SELESAI",
    totalHoursCol: lang === "en" ? "TOTAL HOURS" : "TOTAL JAM",
    projectTask: lang === "en" ? "PROJECT/TASK" : "PROYEK/TUGAS",
    billableHoursCol: lang === "en" ? "BILLABLE HOURS" : "JAM TAGIHKAN",
    total: lang === "en" ? "TOTAL" : "TOTAL",
    generated: lang === "en" ? "Generated" : "Dibuat",
    duties: lang === "en" ? "Duties:" : "Tugas:",
    clientLabel: lang === "en" ? "Client:" : "Klien:",
    projectHoursTitle: lang === "en" ? "Hours by project" : "Jam per proyek",
    taskHoursTitle: lang === "en" ? "Hours by task" : "Jam per tugas",
    flatFee: lang === "en" ? "flat fee" : "biaya tetap",
    btProject: lang === "en" ? "flat" : "tetap",
    btPackage: lang === "en" ? "package" : "paket",
    packageQuota: lang === "en" ? "Package quota" : "Kuota paket",
    packageUsage: lang === "en" ? "Used / quota" : "Terpakai / kuota",
  };

  // ── DETAILED REPORT: group by client, then by entry (ascending) ──
  const clientGroups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const clientName = entry.client || (lang === "en" ? "No client" : "Tanpa klien");
    if (!clientGroups.has(clientName)) clientGroups.set(clientName, []);
    clientGroups.get(clientName)!.push(entry);
  }

  let detailedRows = "";
  for (const [clientName, clientEntries] of clientGroups) {
    const clientMinutes = clientEntries.reduce((s, e) => s + Number(e.durationMinutes ?? 0), 0);
    // Time-based amount by currency for this client.
    const clientMoney = sumByCurrency(clientEntries);
    // Add flat fees for distinct project-billed projects in this client group.
    const clientFlatSeen = new Set<string>();
    for (const e of clientEntries) {
      if ((e.billingType ?? "hours") !== "project") continue;
      if (!e.projectId || clientFlatSeen.has(e.projectId)) continue;
      clientFlatSeen.add(e.projectId);
      const fee = Number(e.projectRate ?? 0);
      if (fee <= 0) continue;
      const cur = (e.projectCurrency || "IDR").toUpperCase();
      clientMoney.set(cur, (clientMoney.get(cur) ?? 0) + fee);
    }

    detailedRows += `<tr class="client-row">
      <td colspan="4">${escapeHtml(L.clientLabel)} ${escapeHtml(clientName)}</td>
      <td>${escapeHtml(renderMoneyMap(clientMoney))}</td>
      <td></td>
      <td>${formatHours(clientMinutes)}</td>
    </tr>`;

    for (const entry of clientEntries) {
      const minutes = Number(entry.durationMinutes ?? 0);
      const bt = entry.billingType ?? "hours";
      const cur = entry.projectCurrency;
      // Per-entry cell: hours/package show the computed amount; project (flat fee)
      // shows a "flat fee" tag since the fee is billed once at project level.
      let amountCell: string;
      if (bt === "project") {
        amountCell = `<span class="flat-tag">${escapeHtml(L.flatFee)}</span>`;
      } else {
        amountCell = escapeHtml(formatMoney(entryAmount(entry), cur));
      }

      detailedRows += `<tr class="entry-row">
        <td>${entry.date ? escapeHtml(formatDateShort(entry.date, locale)) : "—"}</td>
        <td>${escapeHtml(entry.user)}</td>
        <td>${escapeHtml(entry.project)}${bt !== "hours" ? ` <span class="bt-tag">${escapeHtml(bt === "project" ? L.btProject : L.btPackage)}</span>` : ""}</td>
        <td>${escapeHtml(entry.task)}</td>
        <td>${amountCell}</td>
        <td>${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}</td>
        <td>${formatHours(minutes)}</td>
      </tr>`;
      detailedRows += `<tr class="tags-row"><td></td><td colspan="6" class="tags-cell">${escapeHtml(entry.tags)}</td></tr>`;
      detailedRows += renderDuties(entry.description, L.duties);
    }
  }

  // ── DASHBOARD REPORT: group project → task with subtotals ──
  type ProjMeta = {
    tasks: Map<string, { total: number; billable: number }>;
    billingType: BillingType;
    currency: string | null;
    flatFee: number;
    timeAmount: number; // hours/package computed amount
    packageHours: number | null;
  };
  const projectTaskMap = new Map<string, ProjMeta>();
  const projectSummary: Slice[] = [];
  const taskSummaryMap = new Map<string, number>();

  for (const entry of entries) {
    const projName = entry.project || (lang === "en" ? "No project" : "Tanpa proyek");
    const taskName = entry.task || (lang === "en" ? "No task" : "Tanpa tugas");
    const minutes = Number(entry.durationMinutes ?? 0);
    if (!projectTaskMap.has(projName)) {
      projectTaskMap.set(projName, {
        tasks: new Map(),
        billingType: entry.billingType ?? "hours",
        currency: entry.projectCurrency,
        flatFee: (entry.billingType ?? "hours") === "project" ? Number(entry.projectRate ?? 0) : 0,
        timeAmount: 0,
        packageHours: entry.packageHours ?? null,
      });
    }
    const meta = projectTaskMap.get(projName)!;
    meta.timeAmount += entryAmount(entry);
    if (!meta.tasks.has(taskName)) meta.tasks.set(taskName, { total: 0, billable: 0 });
    const bucket = meta.tasks.get(taskName)!;
    bucket.total += minutes;
    if (entry.billable) bucket.billable += minutes;
    taskSummaryMap.set(taskName, (taskSummaryMap.get(taskName) ?? 0) + minutes);
  }

  let dashboardRows = "";
  for (const [projName, meta] of projectTaskMap) {
    const taskMap = meta.tasks;
    const projTotal = Array.from(taskMap.values()).reduce((s, v) => s + v.total, 0);
    const projBillable = Array.from(taskMap.values()).reduce((s, v) => s + v.billable, 0);
    projectSummary.push({ label: projName, minutes: projTotal });

    // Project-level amount depends on billing type.
    const projAmount = meta.billingType === "project" ? meta.flatFee : meta.timeAmount;
    const amountStr = projAmount > 0 ? formatMoney(projAmount, meta.currency) : "—";

    // Package quota note: used vs included hours.
    let pkgNote = "";
    if (meta.billingType === "package" && meta.packageHours && meta.packageHours > 0) {
      const usedH = (projTotal / 60).toFixed(1);
      pkgNote = ` <span class="pkg-note">(${L.packageUsage}: ${usedH}h / ${meta.packageHours}h)</span>`;
    }
    const btBadge = meta.billingType !== "hours"
      ? ` <span class="bt-tag">${escapeHtml(meta.billingType === "project" ? L.btProject : L.btPackage)}</span>`
      : "";

    dashboardRows += `<tr class="proj-row"><td><strong>Project: ${escapeHtml(projName)}</strong>${btBadge}${pkgNote}</td><td>${formatHours(projTotal)}</td><td>${formatHours(projBillable)}</td><td>${escapeHtml(amountStr)}</td></tr>`;
    for (const [taskName, { total, billable }] of taskMap) {
      dashboardRows += `<tr><td style="padding-left:24px;">${escapeHtml(taskName)}</td><td>${formatHours(total)}</td><td>${formatHours(billable)}</td><td></td></tr>`;
    }
  }

  const taskSummary: Slice[] = Array.from(taskSummaryMap.entries()).map(([label, minutes]) => ({ label, minutes }));

  const projectDonut = donutChart(L.projectHoursTitle, projectSummary);
  const taskDonut = donutChart(L.taskHoursTitle, taskSummary);

  // Dynamic document title based on selected report(s)
  const docTitle = showDetailed && showDashboard
    ? (lang === "en" ? "TIMESHEET REPORT" : "LAPORAN TIMESHEET")
    : showDetailed
      ? L.detailedReport
      : L.dashboardReport;

  const detailedSection = `
  <!-- DETAILED REPORT -->
  <h1>${L.detailedReport}</h1>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">${L.timeFrame}</span><span class="meta-value">${escapeHtml(timeFrame)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalBillableAmount}</span><span class="meta-value">${escapeHtml(renderMoneyMap(grandTotalByCurrency))}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalHours}</span><span class="meta-value">${formatHours(totalMinutes)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${L.day}</th>
        <th>${L.userCol}</th>
        <th>${L.project}</th>
        <th>${L.task}</th>
        <th>${L.billableAmount}</th>
        <th>${L.startFinish}</th>
        <th>${L.totalHoursCol}</th>
      </tr>
    </thead>
    <tbody>
      ${detailedRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right;">${L.total}</td>
        <td>${escapeHtml(renderMoneyMap(grandTotalByCurrency))}</td>
        <td></td>
        <td>${formatHours(totalMinutes)}</td>
      </tr>
    </tbody>
  </table>`;

  const dashboardSection = `
  <!-- DASHBOARD REPORT -->
  <h2 ${showDetailed ? 'style="page-break-before: always;"' : ""}>${L.dashboardReport}</h2>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">${L.timeFrame}</span><span class="meta-value">${escapeHtml(timeFrame)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalHours}</span><span class="meta-value">${formatHours(totalMinutes)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.billableHours}</span><span class="meta-value">${formatHours(billableMinutes)}</span></div>
  </div>

  <div class="donuts">
    ${projectDonut}
    ${taskDonut}
  </div>

  <table>
    <thead>
      <tr>
        <th>${L.projectTask}</th>
        <th>${L.totalHoursCol}</th>
        <th>${L.billableHoursCol}</th>
        <th>${L.billableAmount}</th>
      </tr>
    </thead>
    <tbody>
      ${dashboardRows}
      <tr class="total-row">
        <td>${L.total}</td>
        <td>${formatHours(totalMinutes)}</td>
        <td>${formatHours(billableMinutes)}</td>
        <td>${escapeHtml(renderMoneyMap(grandTotalByCurrency))}</td>
      </tr>
    </tbody>
  </table>`;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; }
    h1 { margin: 0 0 4px; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { margin: 28px 0 10px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #111; padding-bottom: 4px; }
    .muted { color: #6b7280; font-size: 11px; }
    .meta { margin: 8px 0 16px; }
    .meta-row { display: flex; gap: 12px; margin: 3px 0; align-items: baseline; }
    .meta-label { color: #6b7280; font-size: 11px; min-width: 150px; }
    .meta-value { font-weight: 700; font-size: 13px; }

    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { text-align: left; background: #111827; color: #fff; padding: 6px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { border-bottom: 1px solid #e5e7eb; padding: 5px 8px; vertical-align: top; }

    tr.client-row td { background: #e8eef9; font-weight: 700; border-top: 1px solid #c7d2fe; border-bottom: 1px solid #c7d2fe; }
    tr.entry-row td { border-bottom: none; }
    tr.tags-row .tags-cell { color: #6b7280; font-size: 10px; padding-top: 0; }
    tr.duties-row td { border-bottom: 1px solid #eef0f2; padding-top: 0; padding-bottom: 8px; }
    .duties { padding-left: 8px; }
    .duties-label { display: block; font-weight: 600; font-size: 10px; color: #374151; margin-bottom: 2px; }
    .duty-item { font-size: 10.5px; color: #4b5563; padding-left: 14px; }

    .total-row td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #111; border-bottom: 2px solid #111; }
    tr.proj-row td { background: #f3f4f6; }

    .bt-tag { display: inline-block; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.03em; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 4px; padding: 0 4px; margin-left: 4px; vertical-align: middle; }
    .flat-tag { display: inline-block; font-size: 9px; font-style: italic; color: #6b7280; }
    .pkg-note { font-size: 10px; color: #6b7280; font-weight: 400; }

    /* Donut dashboard */
    .donuts { display: flex; gap: 48px; justify-content: center; margin: 16px 0 8px; }
    .donut-block { text-align: center; }
    .donut-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; color: #374151; }
    .donut-chart-wrap { display: flex; justify-content: center; }
    .legend { margin-top: 10px; text-align: left; display: inline-block; }
    .legend-row { display: flex; align-items: center; gap: 6px; margin: 2px 0; font-size: 10.5px; }
    .legend-swatch { width: 11px; height: 11px; border-radius: 2px; display: inline-block; flex-shrink: 0; }
    .legend-label { flex: 1; }
    .legend-pct { color: #6b7280; font-weight: 600; margin-left: 8px; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${showDetailed ? detailedSection : ""}
  ${showDashboard ? dashboardSection : ""}

  <p class="muted" style="margin-top:24px;">${L.generated} ${escapeHtml(new Date().toLocaleString(locale))}</p>
  <script>window.print()</script>
</body>
</html>`;

  await writeActivityLog(workspaceId, user.id, "exported_va_timesheet", "time_entry");
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="va-timesheet-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}
