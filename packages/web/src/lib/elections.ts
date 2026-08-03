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
  monthIndex: number; // 0 = Dec prior, 1 = Jan ... 12 = Dec
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

const YEAR_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#6366f1", "#22c55e", "#eab308", "#d946ef",
  "#0ea5e9", "#f43f5e", "#64748b", "#a3e635", "#fb923c",
  "#38bdf8", "#c084fc", "#f87171", "#2dd4bf", "#94a3b8",
];

const CURRENT_YEAR_COLOR = "#f97316"; // bright orange

export function computeIndividualPathSeries(
  monthMap: MonthCloseMap,
  cycleYear: number
): PathSeries[] {
  const terms = getTermContext(cycleYear);
  const currentYear = new Date().getFullYear();

  const historicalSeries: PathSeries[] = [];
  let currentSeries: PathSeries | null = null;

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const janClose = getClose(monthMap, term.targetYear, 1);
    if (janClose == null || janClose === 0) continue;

    const points: PathPoint[] = [];
    for (let m = 1; m <= 12; m++) {
      const close = getClose(monthMap, term.targetYear, m);
      points.push({
        monthIndex: m - 1,
        value: close == null ? null : (close / janClose) * 100,
      });
    }

    const isCurrent = term.targetYear === currentYear;
    const series: PathSeries = {
      id: `year-${term.targetYear}`,
      label: isCurrent
        ? `${term.targetYear} – ${term.president} (${term.party[0]}) • current`
        : `${term.targetYear} – ${term.president} (${term.party[0]})`,
      color: isCurrent ? CURRENT_YEAR_COLOR : YEAR_COLORS[i % YEAR_COLORS.length],
      points,
      lineWidth: isCurrent ? 4 : 1.5,
      opacity: isCurrent ? 1 : 0.45,
      showInLegend: isCurrent ? true : false,
    };

    if (isCurrent) {
      currentSeries = series;
    } else {
      historicalSeries.push(series);
    }
  }

  // Average of all available years
  const allYearSeries = currentSeries ? [...historicalSeries, currentSeries] : historicalSeries;
  const avgPoints: PathPoint[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const vals = allYearSeries
      .map((s) => s.points[monthIndex].value)
      .filter((v): v is number => v != null && isFinite(v));
    return {
      monthIndex,
      value: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    };
  });

  return [
    ...historicalSeries,
    {
      id: "average",
      label: "Average",
      color: "#111827",
      points: avgPoints,
      lineWidth: 2.5,
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
