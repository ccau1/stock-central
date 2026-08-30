/**
 * Centralized US Eastern Time formatting utilities.
 *
 * All market events (earnings, macro releases) are displayed in US ET.
 * Using the local machine timezone (e.g. Hong Kong) causes dates/times
 * to shift, so every formatter here explicitly targets America/New_York.
 */

const US_TIMEZONE = "America/New_York";

function formatToParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: US_TIMEZONE, ...options }).formatToParts(date);
}

function getPart(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** Extract the US-ET calendar date as { year, month, day } from a Date or timestamp. */
export function getUsDateParts(input: Date | number): { year: number; month: number; day: number } {
  const date = typeof input === "number" ? new Date(input * 1000) : input;
  const parts = formatToParts(date, { year: "numeric", month: "numeric", day: "numeric" });
  return {
    year: parseInt(getPart(parts, "year")),
    month: parseInt(getPart(parts, "month")),
    day: parseInt(getPart(parts, "day")),
  };
}

/** Build a stable YYYY-MM-DD key in US ET for grouping/sorting. */
export function getUsDateKey(input: Date | number): string {
  const { year, month, day } = getUsDateParts(input);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD string as a US-ET logical date (no time-of-day shift). */
export function parseUsDate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map((n) => parseInt(n));
  return { year, month, day };
}

/** Advance a US-ET logical date by one day, skipping weekends for trading-session grouping. */
export function nextUsTradingDay(dateStr: string): { year: number; month: number; day: number } {
  let { year, month, day } = parseUsDate(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  const jsDay = d.getUTCDay();
  if (jsDay === 6) {
    d.setUTCDate(d.getUTCDate() + 2);
  } else if (jsDay === 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Get the earnings session date key in US ET. After-hours reports map to the next trading day. */
export function getEarningsSessionKey(ts: number, session: string): string {
  let { year, month, day } = getUsDateParts(ts);
  if (session === "After-hours") {
    ({ year, month, day } = nextUsTradingDay(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`));
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Format a timestamp as a short US-ET clock time, e.g. "9:30 AM ET". */
export function formatUsClockTime(ts: number): string {
  try {
    return (
      new Date(ts * 1000).toLocaleTimeString("en-US", {
        timeZone: US_TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + " ET"
    );
  } catch {
    return "";
  }
}

/** Format a timestamp or YYYY-MM-DD string as a short US-ET date, e.g. "Mon, Aug 4". */
export function formatUsDateShort(input: Date | number | string): string {
  const date =
    typeof input === "string"
      ? new Date(`${input}T00:00:00`)
      : typeof input === "number"
      ? new Date(input * 1000)
      : input;
  return date.toLocaleDateString("en-US", {
    timeZone: US_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format a YYYY-MM-DD string as a full US-ET date, e.g. "Monday, August 4, 2026". */
export function formatUsDateFull(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    timeZone: US_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Number of days from today (US ET) to the given US-ET date string. */
export function daysUntilUsDate(dateStr: string): number {
  const today = getUsDateParts(new Date());
  const target = parseUsDate(dateStr);
  const todayTime = Date.UTC(today.year, today.month - 1, today.day);
  const targetTime = Date.UTC(target.year, target.month - 1, target.day);
  return Math.round((targetTime - todayTime) / (1000 * 60 * 60 * 24));
}

/** Number of days from today (US ET) to the given timestamp. */
export function daysUntilUsTs(ts: number): number {
  return daysUntilUsDate(getUsDateKey(ts));
}
