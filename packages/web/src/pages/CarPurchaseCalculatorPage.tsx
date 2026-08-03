import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Car, Wallet, Percent, TrendingDown, BadgeDollarSign } from "lucide-react";

interface YearRow {
  year: number;
  leaseLoanLeft: number;
  leaseInterestPaid: number;
  leaseTotalPaid: number;
  financeLoanLeft: number;
  financeInterestPaid: number;
  financeTotalPaid: number;
  fullPayLoanLeft: number;
  fullPayInterestPaid: number;
  fullPayTotalPaid: number;
  resaleValue: number;
  cumulativeDepreciationLoss: number;
}

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return moneyFmt.format(n);
}

function parseNum(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

// General car depreciation curve (% of original MSRP remaining at each year)
const DEFAULT_DEPRECIATION_RATES: Record<number, number> = {
  0: 1.0,
  1: 0.8,
  2: 0.68,
  3: 0.58,
  4: 0.5,
  5: 0.43,
  6: 0.37,
  7: 0.32,
  8: 0.28,
  9: 0.25,
  10: 0.22,
};

const MAX_YEARS = 10;
const SETTINGS_KEY = "car-purchase-calculator-settings";

interface Settings {
  carPrice: string;
  carAgeAtPurchase: string;
  leaseTerm: string;
  leaseResidual: string;
  leaseApr: string;
  financeDownPayment: string;
  financeApr: string;
  financeTerm: string;
}

function loadSettings(): Settings {
  const defaults: Settings = {
    carPrice: "45000",
    carAgeAtPurchase: "0",
    leaseTerm: "3",
    leaseResidual: "60",
    leaseApr: "6",
    financeDownPayment: "10",
    financeApr: "6.5",
    financeTerm: "5",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      carPrice: String(parsed.carPrice ?? defaults.carPrice),
      carAgeAtPurchase: String(parsed.carAgeAtPurchase ?? defaults.carAgeAtPurchase),
      leaseTerm: String(parsed.leaseTerm ?? defaults.leaseTerm),
      leaseResidual: String(parsed.leaseResidual ?? defaults.leaseResidual),
      leaseApr: String(parsed.leaseApr ?? defaults.leaseApr),
      financeDownPayment: String(parsed.financeDownPayment ?? defaults.financeDownPayment),
      financeApr: String(parsed.financeApr ?? defaults.financeApr),
      financeTerm: String(parsed.financeTerm ?? defaults.financeTerm),
    };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function amortizeSchedule(principal: number, annualRate: number, years: number) {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;
  const rows: { month: number; balance: number; interest: number; totalInterest: number; totalPaid: number }[] = [];

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  let monthlyPayment: number;
  if (monthlyRate <= 0) {
    monthlyPayment = principal / months;
  } else {
    monthlyPayment =
      (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    totalPaid += monthlyPayment;
    rows.push({ month, balance, interest, totalInterest, totalPaid });
    if (balance <= 0.0001) break;
  }

  return { rows, monthlyPayment };
}

function computeRows(
  carPrice: number,
  carAgeAtPurchase: number,
  leaseTermYears: number,
  leaseResidualPercent: number,
  leaseApr: number,
  financeDownPaymentPercent: number,
  financeApr: number,
  financeTermYears: number,
  isLeaseApplicable: boolean
): YearRow[] {
  const years = MAX_YEARS;

  // Lease is modeled as an amortizing loan on the depreciable portion of the car.
  // Leasing is typically only available for new cars.
  const leasePrincipal = isLeaseApplicable
    ? Math.max(0, carPrice * (1 - leaseResidualPercent / 100))
    : 0;
  const leaseSchedule = isLeaseApplicable
    ? amortizeSchedule(leasePrincipal, leaseApr, leaseTermYears)
    : { rows: [] as { month: number; balance: number; interest: number; totalInterest: number; totalPaid: number }[], monthlyPayment: 0 };
  const leaseUpfront = 0; // No separate down payment assumption for simplicity.

  // Finance is an amortizing loan on (car price - down payment).
  const financePrincipal = Math.max(0, carPrice * (1 - financeDownPaymentPercent / 100));
  const financeSchedule = amortizeSchedule(financePrincipal, financeApr, financeTermYears);
  const financeUpfront = carPrice - financePrincipal;

  const rows: YearRow[] = [];

  for (let year = 0; year <= years; year++) {
    const leaseMonthIndex = isLeaseApplicable
      ? Math.min(year * 12, leaseSchedule.rows.length - 1)
      : -1;
    const leaseRow = leaseSchedule.rows[leaseMonthIndex] ?? {
      balance: 0,
      totalInterest: 0,
      totalPaid: 0,
    };

    const financeMonthIndex = Math.min(year * 12, financeSchedule.rows.length - 1);
    const financeRow = financeSchedule.rows[financeMonthIndex] ?? {
      balance: 0,
      totalInterest: 0,
      totalPaid: 0,
    };

    const carAge = carAgeAtPurchase + year;
    const resaleRate =
      DEFAULT_DEPRECIATION_RATES[carAge] ?? DEFAULT_DEPRECIATION_RATES[MAX_YEARS];
    const resaleValue = carPrice * resaleRate;

    rows.push({
      year,
      leaseLoanLeft: leaseRow.balance,
      leaseInterestPaid: leaseRow.totalInterest,
      leaseTotalPaid: leaseUpfront + leaseRow.totalPaid,
      financeLoanLeft: financeRow.balance,
      financeInterestPaid: financeRow.totalInterest,
      financeTotalPaid: financeUpfront + financeRow.totalPaid,
      fullPayLoanLeft: 0,
      fullPayInterestPaid: 0,
      fullPayTotalPaid: carPrice,
      resaleValue,
      cumulativeDepreciationLoss: carPrice - resaleValue,
    });
  }

  return rows;
}

interface SeriesConfig {
  key: keyof YearRow;
  label: string;
  color: string;
}

const ALL_SERIES: SeriesConfig[] = [
  { key: "leaseLoanLeft", label: "Lease loan left", color: "#f59e0b" },
  { key: "leaseInterestPaid", label: "Lease interest paid", color: "#fbbf24" },
  { key: "financeLoanLeft", label: "Finance loan left", color: "#3b82f6" },
  { key: "financeInterestPaid", label: "Finance interest paid", color: "#60a5fa" },
  { key: "fullPayLoanLeft", label: "Full pay", color: "#10b981" },
  { key: "resaleValue", label: "Resale value", color: "#ef4444" },
];

function ComparisonChart({
  rows,
  series,
  hoveredYear,
  onHoverYear,
}: {
  rows: YearRow[];
  series: SeriesConfig[];
  hoveredYear?: number | null;
  onHoverYear?: (year: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [localHoverYear, setLocalHoverYear] = useState<number | null>(null);

  const margin = { top: 10, right: 20, bottom: 50, left: 70 };
  const viewBoxWidth = 900;
  const viewBoxHeight = 360;
  const plotWidth = viewBoxWidth - margin.left - margin.right;
  const plotHeight = viewBoxHeight - margin.top - margin.bottom;

  const maxYear = rows[rows.length - 1]?.year ?? MAX_YEARS;
  const maxValue = Math.max(
    1,
    ...rows.flatMap((r) => [
      r.leaseLoanLeft,
      r.leaseInterestPaid,
      r.financeLoanLeft,
      r.financeInterestPaid,
      r.resaleValue,
    ])
  );

  const xScale = (year: number) =>
    margin.left + (year / maxYear) * plotWidth;
  const yScale = (value: number) =>
    margin.top + plotHeight - (value / maxValue) * plotHeight;

  const yTicks = niceTicks(maxValue, 5);
  const xTicks = rows.map((r) => r.year);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rows.length === 0) return;
    const svgX = e.clientX - rect.left;
    const plotX = (svgX / rect.width) * viewBoxWidth - margin.left;
    const year = Math.round((plotX / plotWidth) * maxYear);
    const clamped = Math.max(0, Math.min(maxYear, year));
    setLocalHoverYear(clamped);
    onHoverYear?.(clamped);
  };

  const handleLeave = () => {
    setLocalHoverYear(null);
    onHoverYear?.(null);
  };

  const hoverYear = localHoverYear ?? hoveredYear ?? null;
  const hoverRow = rows.find((r) => r.year === hoverYear) ?? null;

  return (
    <div className="relative h-[360px] w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {/* Grid lines */}
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
        {xTicks.map((year) => (
          <line
            key={`v-${year}`}
            x1={xScale(year)}
            y1={margin.top}
            x2={xScale(year)}
            y2={margin.top + plotHeight}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        {/* Lines */}
        {series.map((s) => {
          const points = rows.map((r) => `${xScale(r.year)} ${yScale(r[s.key])}`).join(" L ");
          const isSinglePoint =
            s.key === "fullPayLoanLeft" && rows.every((r) => r[s.key] === 0);
          return (
            <g key={s.key}>
              <path
                d={`M ${points}`}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeDasharray={s.key === "fullPayLoanLeft" ? "4 4" : undefined}
              />
              {isSinglePoint && (
                <circle
                  cx={xScale(0)}
                  cy={yScale(0)}
                  r={4}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* Axes */}
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

        {/* Y-axis labels */}
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

        {/* X-axis labels */}
        {xTicks.map((year) => (
          <text
            key={`xl-${year}`}
            x={xScale(year)}
            y={margin.top + plotHeight + 14}
            textAnchor="middle"
            className="fill-gray-500 text-[9px]"
          >
            {year}
          </text>
        ))}
        <text
          x={margin.left + plotWidth / 2}
          y={viewBoxHeight - 6}
          textAnchor="middle"
          className="fill-gray-400 text-[9px] font-medium"
        >
          Years since purchase
        </text>

        {/* Hover highlight */}
        {hoverRow && (
          <>
            <line
              x1={xScale(hoverRow.year)}
              y1={margin.top}
              x2={xScale(hoverRow.year)}
              y2={margin.top + plotHeight}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            {series.map((s) => (
              <circle
                key={`hover-${s.key}`}
                cx={xScale(hoverRow.year)}
                cy={yScale(hoverRow[s.key])}
                r={3}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoverRow && (
        <div className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] rounded px-2 py-1.5 shadow-lg pointer-events-none max-w-[220px]">
          <div className="font-semibold mb-1">Year {hoverRow.year}</div>
          {series.map((s) => (
            <div key={`tip-${s.key}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-gray-300">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-medium">{formatMoney(hoverRow[s.key])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CarPurchaseCalculatorPage() {
  const currentYear = new Date().getFullYear();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const [carPrice, setCarPrice] = useState<string>(() => loadSettings().carPrice);
  const [carAgeAtPurchase, setCarAgeAtPurchase] = useState<string>(() => loadSettings().carAgeAtPurchase);
  const [leaseTerm, setLeaseTerm] = useState<string>(() => loadSettings().leaseTerm);
  const [leaseResidual, setLeaseResidual] = useState<string>(() => loadSettings().leaseResidual);
  const [leaseApr, setLeaseApr] = useState<string>(() => loadSettings().leaseApr);
  const [financeDownPayment, setFinanceDownPayment] = useState<string>(() => loadSettings().financeDownPayment);
  const [financeApr, setFinanceApr] = useState<string>(() => loadSettings().financeApr);
  const [financeTerm, setFinanceTerm] = useState<string>(() => loadSettings().financeTerm);

  useEffect(() => {
    saveSettings({
      carPrice,
      carAgeAtPurchase,
      leaseTerm,
      leaseResidual,
      leaseApr,
      financeDownPayment,
      financeApr,
      financeTerm,
    });
  }, [carPrice, carAgeAtPurchase, leaseTerm, leaseResidual, leaseApr, financeDownPayment, financeApr, financeTerm]);

  const carPriceNum = Math.max(0, parseNum(carPrice));
  const carAgeAtPurchaseNum = Math.max(0, Math.min(MAX_YEARS, parseNum(carAgeAtPurchase)));
  const leaseTermNum = Math.max(1, parseNum(leaseTerm));
  const leaseResidualNum = Math.max(0, Math.min(100, parseNum(leaseResidual)));
  const leaseAprNum = Math.max(0, parseNum(leaseApr));
  const financeDownPaymentNum = Math.max(0, Math.min(100, parseNum(financeDownPayment)));
  const financeAprNum = Math.max(0, parseNum(financeApr));
  const financeTermNum = Math.max(1, parseNum(financeTerm));
  const isLeaseApplicable = carAgeAtPurchaseNum === 0;
  const activeSeries = isLeaseApplicable
    ? ALL_SERIES
    : ALL_SERIES.filter((s) => !s.key.startsWith("lease"));

  const rows = useMemo(
    () =>
      computeRows(
        carPriceNum,
        carAgeAtPurchaseNum,
        leaseTermNum,
        leaseResidualNum,
        leaseAprNum,
        financeDownPaymentNum,
        financeAprNum,
        financeTermNum,
        isLeaseApplicable
      ),
    [carPriceNum, carAgeAtPurchaseNum, leaseTermNum, leaseResidualNum, leaseAprNum, financeDownPaymentNum, financeAprNum, financeTermNum, isLeaseApplicable]
  );

  const lastRow = rows[rows.length - 1];
  const leaseMoneyFactorDisplay = leaseAprNum / 2400;

  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const update = () => setHeaderHeight(theadRef.current?.offsetHeight ?? 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (hoveredYear == null) return;
    const row = rowRefs.current[hoveredYear];
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredYear]);

  const inputBase =
    "w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Car size={16} className="text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Car Purchase Calculator</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Inputs</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Purchase price
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={carPrice}
                    onChange={(e) => setCarPrice(e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Car age at purchase (years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_YEARS}
                    value={carAgeAtPurchase}
                    onChange={(e) => setCarAgeAtPurchase(e.target.value)}
                    className={inputBase}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Set to 0 for a new car; 2+ for used cars.
                  </p>
                </div>

                <div className={`pt-2 border-t border-gray-100 transition-opacity ${isLeaseApplicable ? "" : "opacity-50 pointer-events-none"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={14} className="text-amber-500" />
                    <h3 className="text-xs font-bold text-gray-800">Lease</h3>
                    {!isLeaseApplicable && (
                      <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                        New cars only
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">
                        Term (years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={leaseTerm}
                        onChange={(e) => setLeaseTerm(e.target.value)}
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">
                        Residual (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={leaseResidual}
                        onChange={(e) => setLeaseResidual(e.target.value)}
                        className={inputBase}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      APR (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={leaseApr}
                      onChange={(e) => setLeaseApr(e.target.value)}
                      className={inputBase}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      ≈ money factor {leaseMoneyFactorDisplay.toFixed(5)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent size={14} className="text-blue-500" />
                    <h3 className="text-xs font-bold text-gray-800">Finance</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">
                        Down payment (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={financeDownPayment}
                        onChange={(e) => setFinanceDownPayment(e.target.value)}
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">
                        Term (years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={financeTerm}
                        onChange={(e) => setFinanceTerm(e.target.value)}
                        className={inputBase}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      APR (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={financeApr}
                      onChange={(e) => setFinanceApr(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BadgeDollarSign size={14} className="text-green-600" />
                <h2 className="text-sm font-bold text-gray-900">10-Year Summary</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-2.5 rounded-lg border transition-opacity ${isLeaseApplicable ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100 opacity-60"}`}>
                  <p className={`text-[10px] font-medium ${isLeaseApplicable ? "text-amber-700" : "text-gray-500"}`}>Lease total paid</p>
                  <p className={`text-sm font-bold ${isLeaseApplicable ? "text-amber-900" : "text-gray-400"}`}>
                    {isLeaseApplicable ? formatMoney(lastRow.leaseTotalPaid) : "—"}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isLeaseApplicable ? "text-amber-700" : "text-gray-400"}`}>
                    {isLeaseApplicable ? `Interest: ${formatMoney(lastRow.leaseInterestPaid)}` : "New cars only"}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[10px] text-blue-700 font-medium">Finance total paid</p>
                  <p className="text-sm font-bold text-blue-900">{formatMoney(lastRow.financeTotalPaid)}</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Interest: {formatMoney(lastRow.financeInterestPaid)}
                  </p>
                </div>
                <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-[10px] text-green-700 font-medium">Full pay</p>
                  <p className="text-sm font-bold text-green-900">{formatMoney(lastRow.fullPayTotalPaid)}</p>
                  <p className="text-[10px] text-green-700 mt-0.5">No interest</p>
                </div>
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-[10px] text-red-700 font-medium">Depreciation loss</p>
                  <p className="text-sm font-bold text-red-900">
                    {formatMoney(lastRow.cumulativeDepreciationLoss)}
                  </p>
                  <p className="text-[10px] text-red-700 mt-0.5">
                    Resale: {formatMoney(lastRow.resaleValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-red-500" />
                <h2 className="text-sm font-bold text-gray-900">How to read this</h2>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Compare how much you still owe (loan left), how much interest you&apos;ve paid, and what the car is worth if you resell it each year. Full pay is a single flat line at zero because the car is owned outright from day one. Set the car&apos;s age at purchase to compare new vs. used cars; depreciation is estimated from a typical used-car curve.
              </p>
            </div>
          </div>

          {/* Chart + Table */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown size={14} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900">Cost Comparison Over Time</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSeries.map((s) => (
                    <div key={`legend-${s.key}`} className="flex items-center gap-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-[10px] text-gray-600">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-[360px]">
                <ComparisonChart
                  rows={rows}
                  series={activeSeries}
                  hoveredYear={hoveredYear}
                  onHoverYear={setHoveredYear}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Year-by-Year Breakdown</h2>
              <div className="overflow-auto max-h-[420px] rounded border border-gray-200">
                <table className="w-full text-[11px]">
                  <thead ref={theadRef} className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Year</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Lease loan left</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Lease interest paid</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Finance loan left</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Finance interest paid</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Full pay</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Resale value</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Depreciation loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isHovered = hoveredYear === row.year;
                      return (
                        <tr
                          key={row.year}
                          ref={(el) => {
                            rowRefs.current[row.year] = el;
                          }}
                          onMouseEnter={() => setHoveredYear(row.year)}
                          onMouseLeave={() => setHoveredYear(null)}
                          style={{ scrollMarginTop: headerHeight }}
                          className={`transition-colors ${isHovered ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-900">
                            {row.year === 0 ? "Purchase" : `Year ${row.year}`}
                            <span className="ml-1.5 text-[9px] text-gray-400">
                              ({currentYear + row.year})
                            </span>
                            {carAgeAtPurchaseNum > 0 && (
                              <span className="ml-1.5 text-[9px] text-gray-400">
                                · age {carAgeAtPurchaseNum + row.year}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                            {isLeaseApplicable ? formatMoney(row.leaseLoanLeft) : "—"}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-amber-600">
                            {isLeaseApplicable ? formatMoney(row.leaseInterestPaid) : "—"}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                            {formatMoney(row.financeLoanLeft)}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-blue-600">
                            {formatMoney(row.financeInterestPaid)}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-green-600">
                            {formatMoney(row.fullPayLoanLeft)}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-red-600">
                            {formatMoney(row.resaleValue)}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">
                            {formatMoney(row.cumulativeDepreciationLoss)}
                          </td>
                        </tr>
                      );
                    })}
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
