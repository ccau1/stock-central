import type { PricePoint } from "./api";

export interface YearReturns {
  year: number;
  months: (number | null)[];
  yearlyReturn: number | null;
}

export interface MonthlyStats {
  /** Average return for each month across all years */
  average: (number | null)[];
  /** Percentage of years with a positive return for each month */
  pctPositive: (number | null)[];
  /** Percentage of years with a negative return for each month */
  pctNegative: (number | null)[];
  /** Median return for each month */
  median: (number | null)[];
  /** Best return for each month */
  best: (number | null)[];
  /** Worst return for each month */
  worst: (number | null)[];
  /** Average of absolute returns */
  absAverage: (number | null)[];
  /** Best absolute return */
  absBest: (number | null)[];
  /** Worst absolute return */
  absWorst: (number | null)[];
  /** Overall best single monthly return */
  overallBest: { value: number; month: number; year: number } | null;
  /** Overall worst single monthly return */
  overallWorst: { value: number; month: number; year: number } | null;
}

function parseYearMonth(dateStr: string): { year: number; month: number } {
  // dateStr is "YYYY-MM-DD"; avoid new Date() timezone issues by parsing directly.
  const [yearStr, monthStr] = dateStr.split("-");
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) - 1 };
}

export function computeMonthlyReturns(points: PricePoint[]): YearReturns[] {
  if (points.length < 2) return [];

  // Use the last available price point in each month as the end-of-month price.
  const monthEndPrices = new Map<string, PricePoint>();
  for (const p of points) {
    const { year, month } = parseYearMonth(p.date);
    const key = `${year}-${month}`;
    const existing = monthEndPrices.get(key);
    if (!existing || p.date > existing.date) {
      monthEndPrices.set(key, p);
    }
  }

  // Sort year-month keys chronologically (numeric, not lexicographic).
  const sortedKeys = Array.from(monthEndPrices.keys()).sort((a, b) => {
    const [aYear, aMonth] = a.split("-").map(Number);
    const [bYear, bMonth] = b.split("-").map(Number);
    if (aYear !== bYear) return aYear - bYear;
    return aMonth - bMonth;
  });

  // Compute month-to-month returns from consecutive end-of-month prices.
  const yearMonths = new Map<number, (number | null)[]>();
  for (let i = 1; i < sortedKeys.length; i++) {
    const currKey = sortedKeys[i];
    const prevKey = sortedKeys[i - 1];
    const curr = monthEndPrices.get(currKey)!;
    const prev = monthEndPrices.get(prevKey)!;

    const [yearStr, monthStr] = currKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const ret = prev.price !== 0 ? ((curr.price - prev.price) / prev.price) * 100 : 0;

    if (!yearMonths.has(year)) {
      yearMonths.set(year, Array(12).fill(null));
    }
    yearMonths.get(year)![month] = ret;
  }

  if (yearMonths.size === 0) return [];

  // Yearly return = (last price of current year / last price of previous year - 1).
  // Use the end-of-December price from monthEndPrices when available.
  const years = Array.from(yearMonths.keys()).sort((a, b) => b - a);
  return years.map((year) => {
    const currDec = monthEndPrices.get(`${year}-11`);
    const prevDec = monthEndPrices.get(`${year - 1}-11`);
    const yearlyReturn =
      currDec && prevDec && prevDec.price !== 0
        ? ((currDec.price - prevDec.price) / prevDec.price) * 100
        : null;

    return {
      year,
      months: yearMonths.get(year)!,
      yearlyReturn,
    };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeMonthlyStats(returns: YearReturns[]): MonthlyStats {
  const average: (number | null)[] = [];
  const pctPositive: (number | null)[] = [];
  const pctNegative: (number | null)[] = [];
  const medians: (number | null)[] = [];
  const best: (number | null)[] = [];
  const worst: (number | null)[] = [];
  const absAverage: (number | null)[] = [];
  const absBest: (number | null)[] = [];
  const absWorst: (number | null)[] = [];

  let overallBest: { value: number; month: number; year: number } | null = null;
  let overallWorst: { value: number; month: number; year: number } | null = null;

  for (let month = 0; month < 12; month++) {
    const vals: number[] = [];
    for (const row of returns) {
      const v = row.months[month];
      if (v !== null) {
        vals.push(v);
        if (overallBest === null || v > overallBest.value) {
          overallBest = { value: v, month, year: row.year };
        }
        if (overallWorst === null || v < overallWorst.value) {
          overallWorst = { value: v, month, year: row.year };
        }
      }
    }

    if (vals.length === 0) {
      average.push(null);
      pctPositive.push(null);
      pctNegative.push(null);
      medians.push(null);
      best.push(null);
      worst.push(null);
      absAverage.push(null);
      absBest.push(null);
      absWorst.push(null);
      continue;
    }

    const positive = vals.filter((v) => v > 0).length;
    const negative = vals.filter((v) => v < 0).length;
    const absVals = vals.map((v) => Math.abs(v));

    average.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    pctPositive.push((positive / vals.length) * 100);
    pctNegative.push((negative / vals.length) * 100);
    medians.push(median(vals));
    best.push(Math.max(...vals));
    worst.push(Math.min(...vals));
    absAverage.push(absVals.reduce((a, b) => a + b, 0) / absVals.length);
    absBest.push(Math.max(...absVals));
    absWorst.push(Math.min(...absVals));
  }

  return {
    average,
    pctPositive,
    pctNegative,
    median: medians,
    best,
    worst,
    absAverage,
    absBest,
    absWorst,
    overallBest,
    overallWorst,
  };
}

export function formatPct(value: number | null, decimals = 2): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
