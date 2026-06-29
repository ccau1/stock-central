import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
  Copy,
  BarChart3,
  X,
  Edit2,
  Building2,
  Wallet,
} from "lucide-react";

type PaymentFrequency = "monthly" | "biweekly" | "weekly";

interface MortgageSession {
  id: string;
  label: string;
  years: number; // term length in years
  amortizationYears: number; // amortization length used at the start of this term
  rate: number; // annual interest rate in percent
  frequency: PaymentFrequency;
}

interface Property {
  id: string;
  name: string;
  purchasePrice: number;
  downPaymentPercent: number;
  amortizationYears: number;
  startYear: number;
  startMonth: number;
  sessions: MortgageSession[];
  extraPayments: ExtraPayment[];
}

interface SavedScenario {
  id: string;
  name: string;
  purchasePrice: number;
  downPaymentPercent: number;
  amortizationYears: number;
  startYear: number;
  startMonth: number;
  sessions: MortgageSession[];
  extraPayments: ExtraPayment[];
  createdAt: number;
}

interface ExtraPayment {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

interface PaymentRow {
  period: number;
  year: number;
  month: number;
  sessionIndex: number;
  sessionLabel: string;
  rate: number;
  frequency: PaymentFrequency;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  extraPayment?: number;
  extraPaymentIds?: string[];
}

interface YearlySummary {
  year: number;
  sessionIndex: number;
  sessionLabel: string;
  rate: number;
  frequency: PaymentFrequency;
  payments: number;
  principal: number;
  interest: number;
  extraPayments: number;
  endingBalance: number;
}

const PROPERTIES_KEY = "mortgageCalculatorProperties";
const SCENARIOS_KEY = "mortgageCalculatorScenarios";
const ACTIVE_PROPERTY_KEY = "mortgageCalculatorActiveProperty";

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return moneyFmt.format(n);
}

function formatIntegerWithCommas(n: number): string {
  return Math.floor(Math.max(0, n)).toLocaleString("en-US");
}

interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "inputMode"
  > {
  value: number;
  onChange: (value: number) => void;
}

function NumericInput({ value, onChange, ...props }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const raw = input.value;
    const selectionStart = input.selectionStart ?? raw.length;

    const digitCountBefore = (raw.slice(0, selectionStart).match(/\d/g) || []).length;
    const digits = raw.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : 0;
    const nextDisplay = formatIntegerWithCommas(num);

    let nextCursor = nextDisplay.length;
    let digitsSeen = 0;
    for (let i = 0; i < nextDisplay.length; i++) {
      if (/\d/.test(nextDisplay[i])) {
        digitsSeen++;
        if (digitsSeen === digitCountBefore) {
          nextCursor = i + 1;
          break;
        }
      }
    }

    onChange(num);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={formatIntegerWithCommas(value)}
      onChange={handleChange}
      {...props}
    />
  );
}

function parseNum(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== date.getDate()) {
    result.setDate(0);
  }
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function computePrincipal(purchasePrice: number, downPaymentPercent: number): number {
  return Math.max(0, purchasePrice * (1 - Math.max(0, Math.min(100, downPaymentPercent)) / 100));
}

function paymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
    default:
      return 12;
  }
}

function frequencyLabel(frequency: PaymentFrequency): string {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Bi-weekly";
    case "monthly":
    default:
      return "Monthly";
  }
}

function createDefaultSessions(totalAmortizationYears: number): MortgageSession[] {
  const terms = [
    { label: "Term 1", years: 5, rate: 5.0 },
    { label: "Renewal 1", years: 5, rate: 5.5 },
    { label: "Renewal 2", years: 5, rate: 5.0 },
    { label: "Renewal 3", years: 10, rate: 4.5 },
  ];
  let consumedYears = 0;
  return terms.map(({ label, years, rate }) => {
    const session: MortgageSession = {
      id: generateId(),
      label,
      years,
      amortizationYears: Math.max(years, totalAmortizationYears - consumedYears),
      rate,
      frequency: "monthly",
    };
    consumedYears += years;
    return session;
  });
}

function createDefaultProperty(name = "Property 1"): Property {
  const now = new Date();
  const amortizationYears = 25;
  return {
    id: generateId(),
    name,
    purchasePrice: 625000,
    downPaymentPercent: 20,
    amortizationYears,
    startYear: now.getFullYear(),
    startMonth: now.getMonth() + 1,
    sessions: createDefaultSessions(amortizationYears),
    extraPayments: [],
  };
}

function migrateProperty(value: unknown): Property {
  const now = new Date();
  const raw = (typeof value === "object" && value !== null ? value : {}) as Partial<Property> & {
    principal?: number;
  };

  let purchasePrice = raw.purchasePrice ?? 0;
  let downPaymentPercent = raw.downPaymentPercent ?? 0;

  // Legacy: properties used to store only principal.
  if (purchasePrice <= 0 && (raw.principal ?? 0) > 0) {
    purchasePrice = raw.principal ?? 0;
    downPaymentPercent = 0;
  }
  if (purchasePrice <= 0) {
    purchasePrice = 625000;
    downPaymentPercent = 20;
  }

  const amortizationYears = Math.max(1, raw.amortizationYears ?? 25);

  return {
    id: raw.id || generateId(),
    name: raw.name || "Property",
    purchasePrice,
    downPaymentPercent: Math.max(0, Math.min(100, downPaymentPercent)),
    amortizationYears,
    startYear: raw.startYear ?? now.getFullYear(),
    startMonth: Math.max(1, Math.min(12, raw.startMonth ?? now.getMonth() + 1)),
    sessions: migrateSessions(raw.sessions, amortizationYears),
    extraPayments: migrateExtraPayments(raw.extraPayments),
  };
}

function migrateSessions(
  sessions: unknown,
  totalAmortizationYears: number
): MortgageSession[] {
  const rawSessions = Array.isArray(sessions) ? (sessions as Partial<MortgageSession>[]) : [];
  if (rawSessions.length === 0) {
    return createDefaultSessions(totalAmortizationYears);
  }

  let consumedYears = 0;
  return rawSessions.map((s) => {
    const years = Math.max(1, s.years ?? 5);
    const amortizationYears =
      s.amortizationYears && s.amortizationYears > 0
        ? s.amortizationYears
        : Math.max(years, totalAmortizationYears - consumedYears);
    consumedYears += years;
    return {
      id: s.id || generateId(),
      label: s.label || "Term",
      years,
      amortizationYears,
      rate: Math.max(0, s.rate ?? 5),
      frequency: (s.frequency as PaymentFrequency) || "monthly",
    };
  });
}

function migrateExtraPayments(value: unknown): ExtraPayment[] {
  if (!Array.isArray(value)) return [];
  const today = formatDateInput(new Date());
  return value
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const raw = e as Partial<ExtraPayment>;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(raw.date || "") ? raw.date! : today;
      return {
        id: raw.id || generateId(),
        label: raw.label || "Extra payment",
        date,
        amount: Math.max(0, raw.amount ?? 0),
      };
    });
}

function loadProperties(): Property[] {
  try {
    const raw = localStorage.getItem(PROPERTIES_KEY);
    if (!raw) return [createDefaultProperty()];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(migrateProperty);
    }
  } catch {
    // ignore
  }
  return [createDefaultProperty()];
}

function saveProperties(properties: Property[]) {
  try {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
  } catch {
    // ignore
  }
}

function loadActivePropertyId(properties: Property[]): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROPERTY_KEY);
    if (raw && properties.some((p) => p.id === raw)) return raw;
  } catch {
    // ignore
  }
  return properties[0].id;
}

function saveActivePropertyId(id: string) {
  try {
    localStorage.setItem(ACTIVE_PROPERTY_KEY, id);
  } catch {
    // ignore
  }
}

function migrateScenario(value: unknown): SavedScenario {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Partial<SavedScenario> & {
    principal?: number;
  };

  let purchasePrice = raw.purchasePrice ?? 0;
  let downPaymentPercent = raw.downPaymentPercent ?? 0;

  if (purchasePrice <= 0 && (raw.principal ?? 0) > 0) {
    purchasePrice = raw.principal ?? 0;
    downPaymentPercent = 0;
  }
  if (purchasePrice <= 0) {
    purchasePrice = 625000;
    downPaymentPercent = 20;
  }

  const amortizationYears = Math.max(1, raw.amortizationYears ?? 25);

  return {
    id: raw.id || generateId(),
    name: raw.name || "Scenario",
    purchasePrice,
    downPaymentPercent: Math.max(0, Math.min(100, downPaymentPercent)),
    amortizationYears,
    startYear: raw.startYear ?? new Date().getFullYear(),
    startMonth: Math.max(1, Math.min(12, raw.startMonth ?? 1)),
    sessions: migrateSessions(raw.sessions, amortizationYears),
    extraPayments: migrateExtraPayments(raw.extraPayments),
    createdAt: raw.createdAt ?? Date.now(),
  };
}

function loadScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(migrateScenario);
  } catch {
    // ignore
  }
  return [];
}

function saveScenarios(scenarios: SavedScenario[]) {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch {
    // ignore
  }
}

function generateAmortizationSchedule(
  principal: number,
  startYear: number,
  startMonth: number,
  sessions: MortgageSession[],
  extraPayments: ExtraPayment[] = []
): { rows: PaymentRow[]; yearly: YearlySummary[]; payoffDate: { year: number; month: number } | null } {
  if (principal <= 0 || sessions.length === 0) {
    return { rows: [], yearly: [], payoffDate: null };
  }

  const sortedExtras = [...extraPayments]
    .filter((e) => e.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .map((e) => ({ ...e, dateObj: parseDateInput(e.date)! }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const rows: PaymentRow[] = [];
  let balance = principal;
  let period = 0;
  let currentDate = new Date(startYear, startMonth - 1, 1);
  let extraIndex = 0;

  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
    if (balance <= 0.0001) break;

    const session = sessions[sessionIndex];
    const ppy = paymentsPerYear(session.frequency);
    const amortizationPayments = Math.max(
      1,
      Math.round(Math.max(session.years, session.amortizationYears) * ppy)
    );
    const periodicRate = session.rate / 100 / ppy;

    let payment: number;
    if (periodicRate <= 0) {
      payment = balance / amortizationPayments;
    } else {
      payment = (balance * periodicRate) / (1 - Math.pow(1 + periodicRate, -amortizationPayments));
    }

    const interestOnly = balance * Math.max(periodicRate, 0);
    if (payment < interestOnly) {
      payment = interestOnly;
    }

    const sessionPayments = Math.max(1, Math.round(session.years * ppy));

    for (let i = 0; i < sessionPayments; i++) {
      if (balance <= 0.0001) break;

      if (session.frequency === "monthly") {
        currentDate = addMonths(currentDate, 1);
      } else if (session.frequency === "biweekly") {
        currentDate = addDays(currentDate, 14);
      } else {
        currentDate = addDays(currentDate, 7);
      }

      let extraPrincipal = 0;
      const appliedIds: string[] = [];
      while (
        extraIndex < sortedExtras.length &&
        sortedExtras[extraIndex].dateObj.getTime() <= currentDate.getTime()
      ) {
        extraPrincipal += sortedExtras[extraIndex].amount;
        appliedIds.push(sortedExtras[extraIndex].id);
        extraIndex++;
      }
      extraPrincipal = Math.min(extraPrincipal, balance);
      balance -= extraPrincipal;

      const interest = balance * periodicRate;
      let principalPaid = payment - interest;
      if (principalPaid >= balance) {
        principalPaid = balance;
        payment = interest + principalPaid;
        balance = 0;
      } else {
        balance -= principalPaid;
      }

      period += 1;
      rows.push({
        period,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        sessionIndex,
        sessionLabel: session.label,
        rate: session.rate,
        frequency: session.frequency,
        payment,
        interest,
        principal: principalPaid,
        balance: Math.max(0, balance),
        extraPayment: extraPrincipal > 0 ? extraPrincipal : undefined,
        extraPaymentIds: appliedIds.length > 0 ? appliedIds : undefined,
      });

      if (balance <= 0.0001) break;
    }

  }

  const yearlyMap = new Map<number, YearlySummary>();
  for (const row of rows) {
    const existing = yearlyMap.get(row.year);
    if (existing) {
      existing.payments += row.payment;
      existing.principal += row.principal;
      existing.interest += row.interest;
      existing.extraPayments += row.extraPayment ?? 0;
      existing.endingBalance = row.balance;
    } else {
      yearlyMap.set(row.year, {
        year: row.year,
        sessionIndex: row.sessionIndex,
        sessionLabel: row.sessionLabel,
        rate: row.rate,
        frequency: row.frequency,
        payments: row.payment,
        principal: row.principal,
        interest: row.interest,
        extraPayments: row.extraPayment ?? 0,
        endingBalance: row.balance,
      });
    }
  }

  const yearly = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);

  const lastRow = rows[rows.length - 1];
  const payoffDate = lastRow ? { year: lastRow.year, month: Math.round(lastRow.month) } : null;

  return { rows, yearly, payoffDate };
}

function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const options = [1, 2, 5, 10].map((m) => m * pow10);
  const step = options.find((s) => s * count >= max) ?? options[options.length - 1];
  const ticks: number[] = [];
  for (let v = 0; v <= max + step; v += step) {
    ticks.push(v);
  }
  return ticks;
}

function BalanceChart({ rows }: { rows: PaymentRow[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<PaymentRow | null>(null);

  const margin = { top: 10, right: 20, bottom: 50, left: 70 };
  const viewBoxWidth = 900;
  const viewBoxHeight = 360;
  const plotWidth = viewBoxWidth - margin.left - margin.right;
  const plotHeight = viewBoxHeight - margin.top - margin.bottom;

  const sampled = useMemo(() => {
    if (rows.length === 0) return [];
    if (rows.length <= 120) return rows;
    const step = Math.ceil(rows.length / 120);
    const result: PaymentRow[] = [];
    for (let i = 0; i < rows.length; i += step) {
      result.push(rows[i]);
    }
    result.push(rows[rows.length - 1]);
    return result;
  }, [rows]);

  const maxValue = Math.max(sampled[0]?.balance ?? 0, ...sampled.map((r) => r.balance), 1);
  const maxPeriod = Math.max(1, rows[rows.length - 1]?.period ?? 1);

  const xScale = (period: number) => margin.left + (period / maxPeriod) * plotWidth;
  const yScale = (value: number) => margin.top + plotHeight - (value / maxValue) * plotHeight;

  const linePath = sampled
    .map((row, i) => `${i === 0 ? "M" : "L"} ${xScale(row.period)} ${yScale(row.balance)}`)
    .join(" ");

  const areaPath =
    sampled.length > 0
      ? `${linePath} L ${xScale(sampled[sampled.length - 1].period)} ${margin.top + plotHeight} L ${xScale(sampled[0].period)} ${margin.top + plotHeight} Z`
      : "";

  const boundaries = useMemo(() => {
    const result: { period: number; label: string }[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].sessionIndex !== rows[i - 1].sessionIndex) {
        result.push({ period: rows[i].period, label: rows[i].sessionLabel });
      }
    }
    return result;
  }, [rows]);

  const paidPeriod = useMemo(() => {
    const now = new Date();
    let period = 0;
    for (const row of rows) {
      const rowDate = new Date(row.year, Math.floor(row.month) - 1);
      if (rowDate.getTime() <= now.getTime()) {
        period = row.period;
      } else {
        break;
      }
    }
    return period;
  }, [rows]);

  const yTicks = niceTicks(maxValue, 5);

  const extraPoints = useMemo(
    () => rows.filter((r) => r.extraPayment && r.extraPayment > 0),
    [rows]
  );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || sampled.length === 0) return;
    const svgX = e.clientX - rect.left;
    const plotX = (svgX / rect.width) * viewBoxWidth - margin.left;
    const period = Math.round((plotX / plotWidth) * maxPeriod);
    const clamped = Math.max(0, Math.min(rows.length - 1, period - 1));
    setHover(rows[clamped]);
  };

  return (
    <div className="relative h-[360px] w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((tick) => (
          <line
            key={`h-${tick}`}
            x1={margin.left}
            y1={yScale(tick)}
            x2={margin.left + plotWidth}
            y2={yScale(tick)}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {paidPeriod > 0 && (
          <rect
            x={margin.left}
            y={margin.top}
            width={xScale(paidPeriod) - margin.left}
            height={plotHeight}
            fill="#dcfce7"
          />
        )}

        {boundaries.map((boundary) => (
          <g key={`boundary-${boundary.period}`}>
            <line
              x1={xScale(boundary.period)}
              y1={margin.top}
              x2={xScale(boundary.period)}
              y2={margin.top + plotHeight}
              stroke="#d1d5db"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={xScale(boundary.period) + 4}
              y={margin.top + 10}
              className="fill-gray-400 text-[9px]"
            >
              {boundary.label}
            </text>
          </g>
        ))}

        {sampled.length > 0 && (
          <path d={areaPath} fill="url(#balanceGradient)" stroke="none" />
        )}

        {sampled.length > 0 && (
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
        )}

        {extraPoints.map((row) => (
          <g key={`extra-${row.period}`}>
            <line
              x1={xScale(row.period)}
              y1={margin.top}
              x2={xScale(row.period)}
              y2={margin.top + plotHeight}
              stroke="#a855f7"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.4}
            />
            <circle
              cx={xScale(row.period)}
              cy={yScale(row.balance)}
              r={3.5}
              fill="#a855f7"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </g>
        ))}

        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left + plotWidth}
          y2={margin.top + plotHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + plotHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {yTicks.map((tick) => (
          <text
            key={`yl-${tick}`}
            x={margin.left - 8}
            y={yScale(tick) + 3}
            textAnchor="end"
            className="fill-gray-500 text-[9px]"
          >
            {formatMoney(tick)}
          </text>
        ))}

        <text
          x={margin.left + plotWidth / 2}
          y={viewBoxHeight - 6}
          textAnchor="middle"
          className="fill-gray-400 text-[9px] font-medium"
        >
          Payment #
        </text>

        {hover && (
          <>
            <line
              x1={xScale(hover.period)}
              y1={margin.top}
              x2={xScale(hover.period)}
              y2={margin.top + plotHeight}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <circle
              cx={xScale(hover.period)}
              cy={yScale(hover.balance)}
              r={4}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {hover && (
        <div className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] rounded px-2 py-1.5 shadow-lg pointer-events-none">
          <div className="font-semibold">
            Payment {hover.period} ({hover.sessionLabel})
          </div>
          <div className="text-gray-300">{hover.year}</div>
          <div className="mt-1">Balance: {formatMoney(hover.balance)}</div>
          <div>Payment: {formatMoney(hover.payment)}</div>
          <div>
            Principal: {formatMoney(hover.principal)} · Interest: {formatMoney(hover.interest)}
          </div>
          {hover.extraPayment ? (
            <div className="text-purple-300">Extra principal: {formatMoney(hover.extraPayment)}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MortgageCalculatorPage() {
  const [properties, setProperties] = useState<Property[]>(loadProperties);
  const [activePropertyId, setActivePropertyId] = useState<string>(() =>
    loadActivePropertyId(properties)
  );
  const activeProperty = properties.find((p) => p.id === activePropertyId) || properties[0];
  const currentYear = new Date().getFullYear();

  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const [scenarios, setScenarios] = useState<SavedScenario[]>(loadScenarios);
  const [scenarioName, setScenarioName] = useState<string>("");
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);

  const [extraPaymentDate, setExtraPaymentDate] = useState<string>(formatDateInput(new Date()));
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<number>(1000);

  useEffect(() => {
    saveProperties(properties);
  }, [properties]);

  useEffect(() => {
    saveActivePropertyId(activePropertyId);
  }, [activePropertyId]);

  const principal = computePrincipal(activeProperty.purchasePrice, activeProperty.downPaymentPercent);

  const { rows, yearly, payoffDate } = useMemo(
    () =>
      generateAmortizationSchedule(
        principal,
        activeProperty.startYear,
        activeProperty.startMonth,
        activeProperty.sessions,
        activeProperty.extraPayments
      ),
    [principal, activeProperty]
  );

  const compareScenario = useMemo(
    () => scenarios.find((s) => s.id === compareScenarioId) || null,
    [scenarios, compareScenarioId]
  );

  const compareResult = useMemo(() => {
    if (!compareScenario) return null;
    return generateAmortizationSchedule(
      computePrincipal(compareScenario.purchasePrice, compareScenario.downPaymentPercent),
      compareScenario.startYear,
      compareScenario.startMonth,
      compareScenario.sessions,
      compareScenario.extraPayments
    );
  }, [compareScenario]);

  const totalPrincipal = principal;
  const totalInterest = rows.reduce((sum, r) => sum + r.interest, 0);
  const totalCost = totalPrincipal + totalInterest;

  const totalExtraPayments = rows.reduce((sum, r) => sum + (r.extraPayment ?? 0), 0);

  const sessionSummaries = useMemo(() => {
    return activeProperty.sessions.map((session, index) => {
      const sessionRows = rows.filter((r) => r.sessionIndex === index);
      const interest = sessionRows.reduce((sum, r) => sum + r.interest, 0);
      const principalPaid = sessionRows.reduce((sum, r) => sum + r.principal, 0);
      const extraPayments = sessionRows.reduce((sum, r) => sum + (r.extraPayment ?? 0), 0);
      const extraIds = new Set<string>();
      sessionRows.forEach((r) => r.extraPaymentIds?.forEach((id) => extraIds.add(id)));
      const extraPaymentDetails = activeProperty.extraPayments
        .filter((e) => extraIds.has(e.id))
        .sort((a, b) => a.date.localeCompare(b.date));
      const firstRow = sessionRows[0];
      const startBalance = firstRow ? firstRow.balance + firstRow.principal : 0;
      const endBalance = sessionRows[sessionRows.length - 1]?.balance ?? startBalance;
      const payment = firstRow?.payment ?? 0;
      return {
        session,
        index,
        payment,
        interest,
        principalPaid,
        extraPayments,
        extraPaymentDetails,
        startBalance,
        endBalance,
      };
    });
  }, [activeProperty, rows]);

  const inputBase =
    "w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";

  function updateActiveProperty(patch: Partial<Property>) {
    setProperties((prev) =>
      prev.map((p) => (p.id === activePropertyId ? { ...p, ...patch } : p))
    );
  }

  function updateSession(id: string, patch: Partial<MortgageSession>) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? {
              ...p,
              sessions: p.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
            }
          : p
      )
    );
  }

  function moveSession(id: string, direction: "up" | "down") {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== activePropertyId) return p;
        const index = p.sessions.findIndex((s) => s.id === id);
        if (index < 0) return p;
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= p.sessions.length) return p;
        const nextSessions = [...p.sessions];
        [nextSessions[index], nextSessions[newIndex]] = [nextSessions[newIndex], nextSessions[index]];
        return { ...p, sessions: nextSessions };
      })
    );
  }

  function addSession() {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== activePropertyId) return p;
        const lastSession = p.sessions[p.sessions.length - 1];
        const amortizationYears = lastSession
          ? Math.max(1, lastSession.amortizationYears - lastSession.years)
          : p.amortizationYears;
        return {
          ...p,
          sessions: [
            ...p.sessions,
            {
              id: generateId(),
              label: `Renewal ${p.sessions.length}`,
              years: 5,
              amortizationYears,
              rate: 5.0,
              frequency: "monthly",
            },
          ],
        };
      })
    );
  }

  function removeSession(id: string) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? { ...p, sessions: p.sessions.filter((s) => s.id !== id) }
          : p
      )
    );
  }

  function addExtraPayment() {
    const amount = extraPaymentAmount;
    const date = extraPaymentDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || amount <= 0) return;
    updateActiveProperty({
      extraPayments: [
        ...activeProperty.extraPayments,
        {
          id: generateId(),
          label: "Extra payment",
          date,
          amount,
        },
      ],
    });
    setExtraPaymentAmount(1000);
  }

  function updateExtraPayment(id: string, patch: Partial<ExtraPayment>) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? {
              ...p,
              extraPayments: p.extraPayments.map((e) =>
                e.id === id ? { ...e, ...patch } : e
              ),
            }
          : p
      )
    );
  }

  function removeExtraPayment(id: string) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? { ...p, extraPayments: p.extraPayments.filter((e) => e.id !== id) }
          : p
      )
    );
  }

  function addProperty() {
    const newProperty = createDefaultProperty(`Property ${properties.length + 1}`);
    setProperties((prev) => [...prev, newProperty]);
    setActivePropertyId(newProperty.id);
  }

  function deleteProperty(id: string) {
    setProperties((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((p) => p.id !== id);
      if (activePropertyId === id) {
        setActivePropertyId(next[0].id);
      }
      return next;
    });
  }

  function startRename(property: Property) {
    setEditingPropertyId(property.id);
    setEditingName(property.name);
  }

  function commitRename() {
    if (editingPropertyId) {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === editingPropertyId ? { ...p, name: editingName.trim() || p.name } : p
        )
      );
    }
    setEditingPropertyId(null);
    setEditingName("");
  }

  function handleSaveScenario() {
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    const newScenario: SavedScenario = {
      id: generateId(),
      name,
      purchasePrice: activeProperty.purchasePrice,
      downPaymentPercent: activeProperty.downPaymentPercent,
      amortizationYears: activeProperty.amortizationYears,
      startYear: activeProperty.startYear,
      startMonth: activeProperty.startMonth,
      sessions: activeProperty.sessions.map((s) => ({ ...s })),
      extraPayments: activeProperty.extraPayments.map((e) => ({ ...e })),
      createdAt: Date.now(),
    };
    const next = [...scenarios, newScenario];
    setScenarios(next);
    saveScenarios(next);
    setScenarioName("");
  }

  function loadScenario(scenario: SavedScenario) {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? {
              ...p,
              purchasePrice: scenario.purchasePrice,
              downPaymentPercent: scenario.downPaymentPercent,
              amortizationYears: scenario.amortizationYears,
              startYear: scenario.startYear,
              startMonth: scenario.startMonth,
              sessions: scenario.sessions.map((s) => ({ ...s })),
              extraPayments: scenario.extraPayments.map((e) => ({ ...e })),
            }
          : p
      )
    );
  }

  function deleteScenario(id: string) {
    const next = scenarios.filter((s) => s.id !== id);
    setScenarios(next);
    saveScenarios(next);
    if (compareScenarioId === id) setCompareScenarioId(null);
  }

  function resetActiveProperty() {
    const now = new Date();
    setProperties((prev) =>
      prev.map((p) =>
        p.id === activePropertyId
          ? {
              ...p,
              purchasePrice: 625000,
              downPaymentPercent: 20,
              amortizationYears: 25,
              startYear: now.getFullYear(),
              startMonth: now.getMonth() + 1,
              sessions: createDefaultSessions(25),
              extraPayments: [],
            }
          : p
      )
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Building2 size={16} className="text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Mortgage Calculator
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetActiveProperty}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={12} />
              Reset property
            </button>
          </div>
        </div>

        {/* Property tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-2">
          <div className="flex items-center gap-2 overflow-x-auto thin-scrollbar">
            {properties.map((property) => {
              const active = property.id === activePropertyId;
              const isEditing = editingPropertyId === property.id;
              return (
                <div
                  key={property.id}
                  className={`group flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg border transition-colors ${
                    active
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-white border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") {
                            setEditingPropertyId(null);
                            setEditingName("");
                          }
                        }}
                        onBlur={commitRename}
                        autoFocus
                        className="w-28 text-xs px-1 py-0.5 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setActivePropertyId(property.id)}
                        className="text-xs font-medium"
                      >
                        {property.name}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startRename(property)}
                          className="p-0.5 rounded hover:bg-black/5"
                        >
                          <Edit2 size={10} />
                        </button>
                        {properties.length > 1 && (
                          <button
                            onClick={() => deleteProperty(property.id)}
                            className="p-0.5 rounded hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <button
              onClick={addProperty}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors shrink-0"
            >
              <Plus size={12} />
              Add property
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Loan Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Purchase price
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <NumericInput
                      value={activeProperty.purchasePrice}
                      onChange={(v) => updateActiveProperty({ purchasePrice: v })}
                      className={`${inputBase} pl-7`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      Down payment
                    </label>
                    <div className="relative">
                      <Percent
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        key={`${activeProperty.id}-dp-${activeProperty.downPaymentPercent}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        placeholder="20"
                        defaultValue={activeProperty.downPaymentPercent}
                        onBlur={(e) => {
                          const parsed = parseNum(e.target.value);
                          const value =
                            Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 20;
                          updateActiveProperty({ downPaymentPercent: value });
                        }}
                        className={`${inputBase} pl-7`}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatMoney(activeProperty.purchasePrice * (activeProperty.downPaymentPercent / 100))} down
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      Loan amount
                    </label>
                    <div className="relative">
                      <DollarSign
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        readOnly
                        value={formatMoney(principal)}
                        className={`${inputBase} pl-7 bg-gray-50 text-gray-600`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Start month
                  </label>
                    <div className="flex gap-2">
                      <select
                        key={`${activeProperty.id}-month-${activeProperty.startMonth}`}
                        defaultValue={activeProperty.startMonth}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(12, parseNum(e.target.value)));
                          updateActiveProperty({ startMonth: value });
                        }}
                        className={inputBase}
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        key={`${activeProperty.id}-year-${activeProperty.startYear}`}
                        type="number"
                        min={1900}
                        max={2100}
                        defaultValue={activeProperty.startYear}
                        onBlur={(e) => {
                          const parsed = parseNum(e.target.value);
                          const value =
                            Number.isFinite(parsed) && parsed >= 1900 && parsed <= 2100
                              ? parsed
                              : currentYear;
                          updateActiveProperty({ startYear: value });
                        }}
                        className={inputBase}
                      />
                    </div>
                  </div>
                </div>
              </div>

            {/* Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Percent size={14} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900">Renewal Sessions</h2>
                </div>
                <button
                  onClick={addSession}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  <Plus size={12} />
                  Add term
                </button>
              </div>

              <div className="space-y-3">
                {activeProperty.sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-gray-200 p-3 bg-gray-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={session.label}
                        onChange={(e) => updateSession(session.id, { label: e.target.value })}
                        className="flex-1 min-w-0 text-xs font-semibold text-gray-900 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveSession(session.id, "up")}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveSession(session.id, "down")}
                          disabled={index === activeProperty.sessions.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => removeSession(session.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-gray-500 mb-0.5">
                          Term (years)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={session.years}
                          onChange={(e) =>
                            updateSession(session.id, {
                              years: Math.max(1, parseNum(e.target.value)),
                            })
                          }
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-500 mb-0.5">
                          Amortization
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={session.amortizationYears}
                          onChange={(e) =>
                            updateSession(session.id, {
                              amortizationYears: Math.max(1, parseNum(e.target.value)),
                            })
                          }
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-500 mb-0.5">
                          Rate %
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={session.rate}
                          onChange={(e) =>
                            updateSession(session.id, {
                              rate: Math.max(0, parseNum(e.target.value)),
                            })
                          }
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-gray-500 mb-0.5">
                          Freq.
                        </label>
                        <select
                          value={session.frequency}
                          onChange={(e) =>
                            updateSession(session.id, {
                              frequency: e.target.value as PaymentFrequency,
                            })
                          }
                          className={inputBase}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const ids = new Set<string>();
                      rows.forEach((r) => {
                        if (r.sessionIndex === index && r.extraPaymentIds) {
                          r.extraPaymentIds.forEach((id) => ids.add(id));
                        }
                      });
                      const extras = activeProperty.extraPayments
                        .filter((e) => ids.has(e.id))
                        .sort((a, b) => a.date.localeCompare(b.date));
                      if (extras.length === 0) return null;
                      return (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-[9px] font-medium text-gray-500 mb-1">
                            Extra payments in this term
                          </p>
                          <div className="space-y-1">
                            {extras.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center justify-between text-[10px] text-purple-700 bg-purple-50 px-2 py-1 rounded"
                              >
                                <span>{e.date}</span>
                                <span className="font-semibold">{formatMoney(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {activeProperty.sessions.length === 0 && (
                <div className="text-center py-6 text-[11px] text-gray-500">
                  Add at least one mortgage term to calculate payments.
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-[10px] text-blue-800">
                  At each renewal, the payment is recalculated from the remaining balance and
                  remaining amortization using that term&apos;s rate and frequency.
                </p>
              </div>
            </div>

            {/* Extra Payments */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Extra Payments</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Date paid
                  </label>
                  <input
                    type="date"
                    value={extraPaymentDate}
                    onChange={(e) => setExtraPaymentDate(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <NumericInput
                      value={extraPaymentAmount}
                      onChange={setExtraPaymentAmount}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addExtraPayment();
                      }}
                      className={`${inputBase} pl-7`}
                    />
                  </div>
                </div>
                <button
                  onClick={addExtraPayment}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>

              {activeProperty.extraPayments.length === 0 ? (
                <p className="text-[11px] text-gray-400">No extra payments added.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {[...activeProperty.extraPayments]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((extra) => (
                      <div
                        key={extra.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
                      >
                        <input
                          type="date"
                          value={extra.date}
                          onChange={(e) => updateExtraPayment(extra.id, { date: e.target.value })}
                          className={`${inputBase} flex-1 min-w-0`}
                        />
                        <div className="relative flex-1 min-w-0">
                          <DollarSign
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <NumericInput
                            value={extra.amount}
                            onChange={(v) =>
                              updateExtraPayment(extra.id, { amount: Math.max(0, v) })
                            }
                            className={`${inputBase} pl-7`}
                          />
                        </div>
                        <button
                          onClick={() => removeExtraPayment(extra.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {totalExtraPayments > 0 && (
                <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-[10px] text-green-800">
                    Total extra principal:{" "}
                    <span className="font-semibold">{formatMoney(totalExtraPayments)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Scenarios */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Save size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Saved Scenarios</h2>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Scenario name"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className={inputBase}
                />
                <button
                  onClick={handleSaveScenario}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-auto">
                {scenarios.length === 0 && (
                  <p className="text-[11px] text-gray-400">No saved scenarios yet.</p>
                )}
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <button onClick={() => loadScenario(scenario)} className="text-left flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-900 truncate">{scenario.name}</p>
                      <p className="text-[9px] text-gray-500">
                        {formatMoney(scenario.purchasePrice)} · {scenario.downPaymentPercent}% down ·{" "}
                        {scenario.amortizationYears}yr
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setCompareScenarioId(compareScenarioId === scenario.id ? null : scenario.id)
                        }
                        className={`p-1.5 rounded transition-colors ${
                          compareScenarioId === scenario.id
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title="Compare"
                      >
                        <BarChart3 size={12} />
                      </button>
                      <button
                        onClick={() =>
                          loadScenario({
                            ...scenario,
                            id: generateId(),
                            name: `${scenario.name} (copy)`,
                            createdAt: Date.now(),
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Duplicate into editor"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => deleteScenario(scenario.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-8 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-blue-600" />
                  <h3 className="text-xs font-semibold text-gray-700">Total Cost</h3>
                </div>
                <div className="text-xl font-bold text-gray-900">{formatMoney(totalCost)}</div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Principal {formatMoney(totalPrincipal)} + Interest {formatMoney(totalInterest)}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={14} className="text-red-500" />
                  <h3 className="text-xs font-semibold text-gray-700">Total Interest</h3>
                </div>
                <div className="text-xl font-bold text-gray-900">{formatMoney(totalInterest)}</div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {totalCost > 0 ? ((totalInterest / totalCost) * 100).toFixed(1) : 0}% of total cost
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-green-600" />
                  <h3 className="text-xs font-semibold text-gray-700">Payoff Date</h3>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {payoffDate ? `${months[payoffDate.month - 1]} ${payoffDate.year}` : "—"}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {rows.length > 0 ? `${rows.length} payments` : "No schedule"}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-purple-600" />
                  <h3 className="text-xs font-semibold text-gray-700">Extra Principal</h3>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatMoney(totalExtraPayments)}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {activeProperty.extraPayments.length} payoff
                  {activeProperty.extraPayments.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Session payments */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Payment by Session</h2>
              <div className="overflow-auto rounded border border-gray-200">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Session
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Payment
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Principal Paid
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Extra Principal
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Interest Paid
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        End Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionSummaries.map((summary) => (
                      <tr key={summary.session.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-900">
                          {summary.session.label}
                          <span className="ml-1.5 text-[9px] text-gray-500">
                            {summary.session.years}yr term @ {summary.session.rate}% ·{" "}
                            {summary.session.amortizationYears}yr amortization
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                          {summary.payment > 0 ? formatMoney(summary.payment) : "—"}
                          <span className="block text-[9px] text-gray-400">
                            {frequencyLabel(summary.session.frequency)}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                          {formatMoney(summary.principalPaid)}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-purple-600">
                          {summary.extraPayments > 0 ? formatMoney(summary.extraPayments) : "—"}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-red-600">
                          {formatMoney(summary.interest)}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right font-semibold text-gray-900">
                          {formatMoney(summary.endBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown size={14} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900">Balance Over Time</h2>
                </div>
                {totalExtraPayments > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-700">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Extra payments
                  </div>
                )}
              </div>
              <BalanceChart rows={rows} />
            </div>

            {/* Comparison */}
            {compareResult && compareScenario && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">
                  Comparison: {compareScenario.name}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500">Total cost</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMoney(compareResult.rows.reduce((sum, r) => sum + r.payment, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Total interest</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMoney(compareResult.rows.reduce((sum, r) => sum + r.interest, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Payments</p>
                    <p className="text-sm font-semibold text-gray-900">{compareResult.rows.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Payoff</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {compareResult.payoffDate
                        ? `${months[compareResult.payoffDate.month - 1]} ${compareResult.payoffDate.year}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-[10px] text-gray-600">
                  Difference in total interest:{" "}
                  <span
                    className={`font-semibold ${
                      compareResult.rows.reduce((sum, r) => sum + r.interest, 0) > totalInterest
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {formatMoney(
                      compareResult.rows.reduce((sum, r) => sum + r.interest, 0) - totalInterest
                    )}
                  </span>{" "}
                  vs current property
                </div>
              </div>
            )}

            {/* Yearly breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Year-by-Year Breakdown</h2>
              <div className="overflow-auto max-h-[420px] rounded border border-gray-200">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Year
                      </th>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Session
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Payments
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Principal
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Extra
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        Interest
                      </th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">
                        End Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearly.map((row) => (
                      <tr key={row.year} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-900">
                          {row.year}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-gray-600">
                          {row.sessionLabel}
                          <span className="ml-1 text-[9px]">@ {row.rate}%</span>
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                          {formatMoney(row.payments)}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-green-600">
                          {formatMoney(row.principal)}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-purple-600">
                          {row.extraPayments > 0 ? formatMoney(row.extraPayments) : "—"}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right text-red-600">
                          {formatMoney(row.interest)}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100 text-right font-semibold text-gray-900">
                          {formatMoney(row.endingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
