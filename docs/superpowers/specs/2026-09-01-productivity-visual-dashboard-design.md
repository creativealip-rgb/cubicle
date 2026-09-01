# Productivity Visual Dashboard Design

## Goal

Turn flat Goal/Habit surfaces into a visual personal-progress dashboard inspired by the supplied THP Tracker workbooks, without copying spreadsheet chrome or adding chart dependencies.

## Data reality

Existing storage already supports required first release:

- goals: status, priority, deadline, manual progress, steps;
- habits: frequency, weekdays, start date, status;
- check-ins: historical local dates.

No schema migration is needed. Goal history is not stored, so the first release must not claim a historical goal trend. Habit trends and heatmaps derive from real check-in history. Goal visuals show current progress only.

## Overview

Desktop uses a two-column visual dashboard; mobile stacks one column.

Top KPI strip:

- active goals;
- average active-goal progress;
- habits completed today versus scheduled today;
- best current streak.

Main visualization:

- priority goals as horizontal progress bars;
- priority color, life area, deadline, days remaining/overdue;
- direct link to goal details.

Habit visualization:

- 35-day contribution-style heatmap using real check-in dates;
- day cells use accessible labels and intensity;
- summary shows completed check-ins and scheduled completion rate;
- weekly completion bars for recent five weeks.

Today's habits remain actionable with check-in controls.

## Goals tab

Move goal creation into a centered responsive dialog. Default page emphasizes existing goals.

Each goal row/card contains:

- current percentage and semantic progress bar;
- priority indicator;
- life area;
- deadline state;
- status selector;
- detail link.

Desktop uses dense list rows rather than a generic card grid. Mobile uses stacked rows with reachable controls.

## Habits tab

Move habit creation into a centered responsive dialog.

Top summary contains:

- active habit count;
- completed today count;
- best current streak;
- 35-day heatmap.

Each active habit contains:

- Today toggle;
- current streak;
- 30-day completion percentage;
- compact 14-day SVG/CSS sparkline or bars;
- schedule summary;
- archive action.

Archived habits remain visually subordinate and restorable.

## Visual language

- Cubiqlo purple remains primary.
- Green indicates completed/on-track.
- Amber indicates approaching deadline or partial consistency.
- Red indicates overdue.
- Neutral muted tones carry inactive dates.
- Native CSS and SVG only; no chart package.
- Use typography, spacing, progress tracks, and data density rather than many generic cards.

## Accessibility

- Every chart has adjacent textual summary.
- Heatmap cells have date and completion labels.
- Progress bars expose `role=progressbar`, current/min/max values.
- Semantic states never rely on color alone.
- Dialogs are centered, keyboard reachable, and responsive.
- Touch targets are at least 44px where primary.
- 390px viewport has zero horizontal overflow.

## Pure domain helpers

Create a small tested module for:

- average goal progress;
- deadline state/days remaining;
- scheduled habits for a date;
- daily heatmap aggregation;
- weekly completion aggregation;
- best current streak.

Helpers accept plain arrays/dates and produce presentation-ready values. Components do not duplicate date/math logic.

## Empty/loading/error behavior

- Empty overview explains which action creates first goal or habit.
- Empty charts render meaningful zero-state copy, not blank axes.
- Server action errors remain visible and preserve input where existing action architecture allows.
- No fabricated trend lines when history is absent.

## Verification

Automated tests cover aggregation, timezone-safe local dates, zero denominators, overdue deadlines, schedules, and sparse check-ins.

Browser QA uses realistic Jamaludin data and proves:

- overview KPIs and charts;
- goal dialog/create/reload;
- habit dialog/check-in/reload;
- heatmap update after check-in;
- desktop and 390×844 screenshots;
- zero overflow;
- clean console/server logs;
- read-only DB persistence evidence.

## Scope limits

No schema migration, gamification points, social comparison, reminders, goal-history fabrication, or third-party chart dependency. Goal milestone editing remains existing detail-page scope.
