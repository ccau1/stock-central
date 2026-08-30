import type { Time, UTCTimestamp } from "lightweight-charts";

/** Interval values used by the charting components. */
export type ChartInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "1d"
  | "1w"
  | "1wk"
  | "1mo";

/**
 * Convert an ISO date string to the format lightweight-charts expects.
 * Daily/weekly/monthly intervals use an ISO date string ("YYYY-MM-DD");
 * intraday intervals use a Unix timestamp.
 */
export function toChartTime(dateStr: string, interval: ChartInterval | string): Time {
  const d = new Date(dateStr);
  if (
    interval === "1d" ||
    interval === "1w" ||
    interval === "1wk" ||
    interval === "1mo"
  ) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return Math.floor(d.getTime() / 1000) as UTCTimestamp;
}

/** Sort lightweight-charts data points by their time value. */
export function sortByTime<T extends { time: Time }>(data: T[]): T[] {
  return [...data].sort((a, b) => {
    if (typeof a.time === "string" && typeof b.time === "string") {
      return a.time.localeCompare(b.time);
    }
    return (a.time as number) - (b.time as number);
  });
}
