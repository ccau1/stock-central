import type { PricePoint } from "./api";

export type Party = "Republican" | "Democrat";

export interface PresidentialTerm {
  startYear: number; // calendar year of the first year of the term
  president: string;
  party: Party;
  termOrder: 1 | 2; // 1 = first term, 2 = second term (or later)
}

/** Calendar-year presidential terms starting with Herbert Hoover (1929). */
export const PRESIDENTIAL_TERMS: PresidentialTerm[] = [
  { startYear: 1929, president: "Herbert Hoover", party: "Republican", termOrder: 1 },
  { startYear: 1933, president: "Franklin D. Roosevelt", party: "Democrat", termOrder: 1 },
  { startYear: 1937, president: "Franklin D. Roosevelt", party: "Democrat", termOrder: 2 },
  { startYear: 1941, president: "Franklin D. Roosevelt", party: "Democrat", termOrder: 2 },
  { startYear: 1945, president: "Franklin D. Roosevelt / Harry S. Truman", party: "Democrat", termOrder: 2 },
  { startYear: 1949, president: "Harry S. Truman", party: "Democrat", termOrder: 1 },
  { startYear: 1953, president: "Dwight D. Eisenhower", party: "Republican", termOrder: 1 },
  { startYear: 1957, president: "Dwight D. Eisenhower", party: "Republican", termOrder: 2 },
  { startYear: 1961, president: "John F. Kennedy", party: "Democrat", termOrder: 1 },
  { startYear: 1965, president: "Lyndon B. Johnson", party: "Democrat", termOrder: 1 },
  { startYear: 1969, president: "Richard Nixon", party: "Republican", termOrder: 1 },
  { startYear: 1973, president: "Richard Nixon / Gerald Ford", party: "Republican", termOrder: 2 },
  { startYear: 1977, president: "Jimmy Carter", party: "Democrat", termOrder: 1 },
  { startYear: 1981, president: "Ronald Reagan", party: "Republican", termOrder: 1 },
  { startYear: 1985, president: "Ronald Reagan", party: "Republican", termOrder: 2 },
  { startYear: 1989, president: "George H. W. Bush", party: "Republican", termOrder: 1 },
  { startYear: 1993, president: "Bill Clinton", party: "Democrat", termOrder: 1 },
  { startYear: 1997, president: "Bill Clinton", party: "Democrat", termOrder: 2 },
  { startYear: 2001, president: "George W. Bush", party: "Republican", termOrder: 1 },
  { startYear: 2005, president: "George W. Bush", party: "Republican", termOrder: 2 },
  { startYear: 2009, president: "Barack Obama", party: "Democrat", termOrder: 1 },
  { startYear: 2013, president: "Barack Obama", party: "Democrat", termOrder: 2 },
  { startYear: 2017, president: "Donald Trump", party: "Republican", termOrder: 1 },
  { startYear: 2021, president: "Joe Biden", party: "Democrat", termOrder: 1 },
  { startYear: 2025, president: "Donald Trump", party: "Republican", termOrder: 2 },
];

export const PARTY_TO_IDEOLOGY: Record<Party, string> = {
  Republican: "Conservative",
  Democrat: "Liberal",
};

export function ideology(party: Party): string {
  return PARTY_TO_IDEOLOGY[party];
}

function getPrevParty(term: PresidentialTerm): Party | null {
  const idx = PRESIDENTIAL_TERMS.findIndex(
    (t) => t.startYear === term.startYear && t.president === term.president
  );
  if (idx <= 0) return null;
  return PRESIDENTIAL_TERMS[idx - 1].party;
}

export interface TermWithContext extends PresidentialTerm {
  prevParty: Party | null;
  targetYear: number;
  cycleYear: number;
}

export function getTermContext(cycleYear: number): TermWithContext[] {
  return PRESIDENTIAL_TERMS.map((term) => ({
    ...term,
    prevParty: getPrevParty(term),
    targetYear: term.startYear + cycleYear - 1,
    cycleYear,
  }));
}

/** Map of "YYYY-MM" -> closing price for that month. */
export type MonthCloseMap = Record<string, number>;

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function buildMonthCloseMap(points: PricePoint[]): MonthCloseMap {
  const map: MonthCloseMap = {};
  for (const p of points) {
    map[monthKey(p.date)] = p.price;
  }
  return map;
}

function getClose(monthMap: MonthCloseMap, year: number, month: number): number | null {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const val = monthMap[key];
  return val == null || !isFinite(val) ? null : val;
}

export interface AnnualReturnEntry {
  term: PresidentialTerm;
  prevParty: Party | null;
  year: number;
  annualReturn: number | null;
}

export function computeAnnualReturns(
  monthMap: MonthCloseMap,
  cycleYear: number
): AnnualReturnEntry[] {
  const terms = getTermContext(cycleYear);
  return terms.map((term) => {
    const prevDec = getClose(monthMap, term.targetYear - 1, 12);
    const dec = getClose(monthMap, term.targetYear, 12);
    let annualReturn: number | null = null;
    if (prevDec != null && prevDec !== 0 && dec != null) {
      annualReturn = (dec - prevDec) / prevDec;
    }
    return { term, prevParty: term.prevParty, year: term.targetYear, annualReturn };
  });
}

export interface PathEntry {
  term: PresidentialTerm;
  prevParty: Party | null;
  year: number;
  values: (number | null)[]; // index 0 = Dec of prior year (base 100), 1-12 = Jan-Dec
}

export function computeRebasedPaths(
  monthMap: MonthCloseMap,
  cycleYear: number
): PathEntry[] {
  const terms = getTermContext(cycleYear);
  return terms.map((term) => {
    const base = getClose(monthMap, term.targetYear - 1, 12);
    const values: (number | null)[] = [base == null ? null : 100];
    if (base == null || base === 0) {
      for (let m = 1; m <= 12; m++) values.push(null);
      return { term, prevParty: term.prevParty, year: term.targetYear, values };
    }
    for (let m = 1; m <= 12; m++) {
      const close = getClose(monthMap, term.targetYear, m);
      values.push(close == null ? null : (close / base) * 100);
    }
    return { term, prevParty: term.prevParty, year: term.targetYear, values };
  });
}

export interface CategoryStats {
  label: string;
  count: number;
  avgReturn: number | null;
  positiveCount: number;
  positivePct: number | null;
  best: number | null;
  worst: number | null;
}

function makeStats(label: string, returns: number[]): CategoryStats {
  if (returns.length === 0) {
    return { label, count: 0, avgReturn: null, positiveCount: 0, positivePct: null, best: null, worst: null };
  }
  const sum = returns.reduce((a, b) => a + b, 0);
  const positiveCount = returns.filter((r) => r > 0).length;
  return {
    label,
    count: returns.length,
    avgReturn: sum / returns.length,
    positiveCount,
    positivePct: positiveCount / returns.length,
    best: Math.max(...returns),
    worst: Math.min(...returns),
  };
}

export interface ElectionStats {
  cycleYear: number;
  overall: CategoryStats;
  firstTerm: CategoryStats;
  secondTerm: CategoryStats;
  conservative: CategoryStats;
  liberal: CategoryStats;
  sameParty: CategoryStats;
  partyChange: CategoryStats;
  conservativeToConservative: CategoryStats;
  conservativeToLiberal: CategoryStats;
  liberalToLiberal: CategoryStats;
  liberalToConservative: CategoryStats;
  annualReturns: AnnualReturnEntry[];
}

export function computeElectionStats(
  monthMap: MonthCloseMap,
  cycleYear: number
): ElectionStats {
  const annual = computeAnnualReturns(monthMap, cycleYear);
  const returns = annual.filter((a) => a.annualReturn != null) as (AnnualReturnEntry & { annualReturn: number })[];

  const overall = makeStats("Overall", returns.map((r) => r.annualReturn));
  const firstTerm = makeStats(
    "First term",
    returns.filter((r) => r.term.termOrder === 1).map((r) => r.annualReturn)
  );
  const secondTerm = makeStats(
    "Second term",
    returns.filter((r) => r.term.termOrder === 2).map((r) => r.annualReturn)
  );
  const conservative = makeStats(
    "Conservative (R)",
    returns.filter((r) => r.term.party === "Republican").map((r) => r.annualReturn)
  );
  const liberal = makeStats(
    "Liberal (D)",
    returns.filter((r) => r.term.party === "Democrat").map((r) => r.annualReturn)
  );

  const withPrev = returns.filter((r) => r.prevParty != null) as (AnnualReturnEntry & {
    annualReturn: number;
    prevParty: Party;
  })[];

  const sameParty = makeStats(
    "Same party",
    withPrev.filter((r) => r.prevParty === r.term.party).map((r) => r.annualReturn)
  );
  const partyChange = makeStats(
    "Party change",
    withPrev.filter((r) => r.prevParty !== r.term.party).map((r) => r.annualReturn)
  );

  const conservativeToConservative = makeStats(
    "Conservative → Conservative",
    withPrev
      .filter((r) => r.prevParty === "Republican" && r.term.party === "Republican")
      .map((r) => r.annualReturn)
  );
  const conservativeToLiberal = makeStats(
    "Conservative → Liberal",
    withPrev
      .filter((r) => r.prevParty === "Republican" && r.term.party === "Democrat")
      .map((r) => r.annualReturn)
  );
  const liberalToLiberal = makeStats(
    "Liberal → Liberal",
    withPrev
      .filter((r) => r.prevParty === "Democrat" && r.term.party === "Democrat")
      .map((r) => r.annualReturn)
  );
  const liberalToConservative = makeStats(
    "Liberal → Conservative",
    withPrev
      .filter((r) => r.prevParty === "Democrat" && r.term.party === "Republican")
      .map((r) => r.annualReturn)
  );

  return {
    cycleYear,
    overall,
    firstTerm,
    secondTerm,
    conservative,
    liberal,
    sameParty,
    partyChange,
    conservativeToConservative,
    conservativeToLiberal,
    liberalToLiberal,
    liberalToConservative,
    annualReturns: annual,
  };
}

export interface PathPoint {
  x: number; // 0 = Jan 1, 11 = Dec 31
  date: string; // YYYY-MM-DD
  value: number | null;
}

export interface PathSeries {
  id: string;
  label: string;
  color: string;
  points: PathPoint[];
  lineWidth?: number;
  opacity?: number;
  showInLegend?: boolean;
}

const REPUBLICAN_COLORS = ["#ef4444", "#f87171", "#b91c1c", "#fca5a5"];
const DEMOCRAT_COLORS = ["#3b82f6", "#60a5fa", "#1d4ed8", "#93c5fd"];

const CURRENT_YEAR_COLOR = "#f97316"; // bright orange
const MOST_RECENT_YEAR_COLOR = "#ec4899"; // bright pink

export interface CandleInput {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function dayOfYear(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00Z");
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function dayX(dateStr: string): number {
  return Math.min(((dayOfYear(dateStr) - 1) / 364) * 11, 11);
}

function dateFromDoy(doy: number): string {
  // Use a non-leap year just to turn day-of-year back into a month/day label
  const date = new Date(Date.UTC(2023, 0, doy));
  return date.toISOString().slice(0, 10);
}

export interface CandlePoint {
  x: number; // 0 = Jan 1, 11 = Dec 31
  date: string; // YYYY-MM-DD
  month: number; // 1-12, for hover lookup
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandleSeries {
  year: number;
  label: string;
  color: string;
  party: Party;
  partyColor: string;
  janClose: number;
  candles: CandlePoint[];
}

export function computeMostRecentYearCandles(
  candles: CandleInput[],
  monthMap: MonthCloseMap,
  cycleYear: number
): CandleSeries | null {
  const currentYear = new Date().getFullYear();
  const terms = getTermContext(cycleYear);
  const candidates = terms
    .filter((t) => t.targetYear !== currentYear)
    .sort((a, b) => b.targetYear - a.targetYear);

  for (const term of candidates) {
    const janClose = getClose(monthMap, term.targetYear, 1);
    if (janClose == null || janClose === 0) continue;

    const yearCandles = candles.filter((c) => c.date.slice(0, 4) === String(term.targetYear));
    if (yearCandles.length === 0) continue;

    const points: CandlePoint[] = yearCandles.map((c) => ({
      x: dayX(c.date),
      date: c.date,
      month: Number(c.date.slice(5, 7)),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    return {
      year: term.targetYear,
      label: `${term.targetYear} – ${term.president} (${term.party[0]})`,
      color: MOST_RECENT_YEAR_COLOR,
      party: term.party,
      partyColor: term.party === "Republican" ? REPUBLICAN_COLORS[0] : DEMOCRAT_COLORS[0],
      janClose,
      candles: points,
    };
  }
  return null;
}

export function computeIndividualPathSeries(
  candles: CandleInput[],
  cycleYear: number,
  mode: "percent" | "price" = "percent",
  historicalLimit?: number
): PathSeries[] {
  const terms = getTermContext(cycleYear);
  const currentYear = new Date().getFullYear();

  const historicalSeries: PathSeries[] = [];
  let currentSeries: PathSeries | null = null;
  const avgByDay: Record<number, number[]> = {};
  let repIndex = 0;
  let demIndex = 0;

  function getJanClose(yearCandles: CandleInput[]): number | null {
    const jan = yearCandles.filter((c) => c.date.slice(5, 7) === "01");
    return jan.length > 0 ? jan[jan.length - 1].close : null;
  }

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const yearCandles = candles
      .filter((c) => c.date.slice(0, 4) === String(term.targetYear))
      .sort((a, b) => a.date.localeCompare(b.date));
    const janClose = getJanClose(yearCandles);
    if (mode === "percent" && (janClose == null || janClose === 0)) continue;
    if (yearCandles.length === 0) continue;

    const points: PathPoint[] = [];
    for (const c of yearCandles) {
      const x = dayX(c.date);
      const value = mode === "percent" ? (c.close / janClose!) * 100 : c.close;
      points.push({ x, date: c.date, value });

      const doy = dayOfYear(c.date);
      if (!avgByDay[doy]) avgByDay[doy] = [];
      avgByDay[doy].push(value);
    }

    const isCurrent = term.targetYear === currentYear;
    const series: PathSeries = {
      id: `year-${term.targetYear}`,
      label: isCurrent
        ? `${term.targetYear} – ${term.president} (${term.party[0]}) • current`
        : `${term.targetYear} – ${term.president} (${term.party[0]})`,
      color: isCurrent
        ? CURRENT_YEAR_COLOR
        : term.party === "Republican"
        ? REPUBLICAN_COLORS[repIndex++ % REPUBLICAN_COLORS.length]
        : DEMOCRAT_COLORS[demIndex++ % DEMOCRAT_COLORS.length],
      points,
      lineWidth: isCurrent ? 2.5 : 1,
      opacity: isCurrent ? 1 : 0.45,
      showInLegend: isCurrent ? true : false,
    };

    if (isCurrent) {
      currentSeries = series;
    } else {
      historicalSeries.push(series);
    }
  }

  const sortedDoys = Object.keys(avgByDay).map(Number).sort((a, b) => a - b);
  const avgPoints: PathPoint[] = sortedDoys.map((doy, i) => {
    // 21-day centered moving average to smooth cross-year daily noise
    const halfWindow = 10;
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(sortedDoys.length - 1, i + halfWindow); j++) {
      const vals = avgByDay[sortedDoys[j]];
      sum += vals.reduce((a, b) => a + b, 0);
      count += vals.length;
    }
    return {
      x: Math.min(((doy - 1) / 364) * 11, 11),
      date: dateFromDoy(doy),
      value: sum / count,
    };
  });

  const displayHistorical =
    historicalLimit != null && historicalLimit > 0
      ? historicalSeries.slice(-historicalLimit)
      : historicalSeries;

  return [
    ...displayHistorical,
    {
      id: "average",
      label: "Average",
      color: "#111827",
      points: avgPoints,
      lineWidth: 1.5,
      opacity: 1,
      showInLegend: true,
    },
    ...(currentSeries ? [currentSeries] : []),
  ];
}

export interface MonthlyStat {
  month: string;
  avgReturn: number | null;
  positivePct: number | null;
  min: number | null;
  max: number | null;
}

export function computeMonthlyStats(
  monthMap: MonthCloseMap,
  cycleYear: number
): MonthlyStat[] {
  const terms = getTermContext(cycleYear);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const returnsByMonth: number[][] = Array.from({ length: 12 }, () => []);

  for (const term of terms) {
    const janClose = getClose(monthMap, term.targetYear, 1);
    if (janClose == null || janClose === 0) continue;
    for (let m = 1; m <= 12; m++) {
      const close = getClose(monthMap, term.targetYear, m);
      if (close == null) continue;
      returnsByMonth[m - 1].push((close - janClose) / janClose);
    }
  }

  return months.map((month, idx) => {
    const vals = returnsByMonth[idx];
    if (vals.length === 0) {
      return { month, avgReturn: null, positivePct: null, min: null, max: null };
    }
    const positiveCount = vals.filter((v) => v > 0).length;
    return {
      month,
      avgReturn: vals.reduce((a, b) => a + b, 0) / vals.length,
      positivePct: positiveCount / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  });
}

export function formatPct(value: number | null, digits = 1): string {
  if (value == null || !isFinite(value)) return "–";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export const CYCLE_YEAR_LABELS: Record<number, string> = {
  1: "Year 1",
  2: "Mid-Term Year",
  3: "Year 3",
  4: "Election Year",
};

export function getCurrentCycleYear(): number | null {
  const currentYear = new Date().getFullYear();
  for (const term of PRESIDENTIAL_TERMS) {
    if (currentYear >= term.startYear && currentYear <= term.startYear + 3) {
      return currentYear - term.startYear + 1;
    }
  }
  return null;
}
