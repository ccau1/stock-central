import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, TrendingUp, Target, PiggyBank } from "lucide-react";

type Frequency = "monthly" | "annual";

interface YearRow {
  age: number;
  year: number;
  startBalance: number;
  contribution: number;
  returns: number;
  endBalance: number;
}

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return moneyFmt.format(n);
}

function clampAge(n: number): number {
  return Math.max(0, Math.min(120, Math.floor(n)));
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

const SETTINGS_KEY = "compound-calculator-settings";

function loadStringSetting(key: string, defaultValue: string): string {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    const value = parsed[key];
    return typeof value === "string" ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

function loadFreqSetting(key: string, defaultValue: Frequency): Frequency {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    const value = parsed[key];
    return value === "monthly" || value === "annual" ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

function ProjectionChart({
  rows,
  fiNumber,
  hoveredAge,
  onHoverAge,
}: {
  rows: YearRow[];
  fiNumber: number;
  hoveredAge?: number | null;
  onHoverAge?: (age: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [localHoverAge, setLocalHoverAge] = useState<number | null>(null);

  const margin = { top: 10, right: 20, bottom: 50, left: 70 };
  const viewBoxWidth = 900;
  const viewBoxHeight = 360;
  const plotWidth = viewBoxWidth - margin.left - margin.right;
  const plotHeight = viewBoxHeight - margin.top - margin.bottom;

  const minAge = rows[0]?.age ?? 0;
  const maxAge = rows[rows.length - 1]?.age ?? minAge;
  const maxValue = Math.max(fiNumber * 1.05, ...rows.map((r) => r.endBalance), 1);

  const xScale = (age: number) =>
    margin.left + ((age - minAge) / (maxAge - minAge)) * plotWidth;
  const yScale = (value: number) =>
    margin.top + plotHeight - (value / maxValue) * plotHeight;

  const linePath = rows
    .map((row, i) => `${i === 0 ? "M" : "L"} ${xScale(row.age)} ${yScale(row.endBalance)}`)
    .join(" ");

  const yTicks = niceTicks(maxValue, 5);
  const xTicks = rows.map((row) => row.age);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rows.length === 0) return;
    const svgX = e.clientX - rect.left;
    const plotX = (svgX / rect.width) * viewBoxWidth - margin.left;
    const age = minAge + (plotX / plotWidth) * (maxAge - minAge);
    const closest = rows.reduce((prev, curr) =>
      Math.abs(curr.age - age) < Math.abs(prev.age - age) ? curr : prev
    );
    setLocalHoverAge(closest.age);
    onHoverAge?.(closest.age);
  };

  const handleLeave = () => {
    setLocalHoverAge(null);
    onHoverAge?.(null);
  };

  const hoverAge = localHoverAge ?? hoveredAge ?? null;
  const hoverRow = rows.find((row) => row.age === hoverAge) ?? null;

  const fiY = yScale(fiNumber);

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
        {xTicks.map((age) => (
          <line
            key={`v-${age}`}
            x1={xScale(age)}
            y1={margin.top}
            x2={xScale(age)}
            y2={margin.top + plotHeight}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        {/* FI target line */}
        {fiNumber > 0 && (
          <>
            <line
              x1={margin.left}
              y1={fiY}
              x2={margin.left + plotWidth}
              y2={fiY}
              stroke="#ef4444"
              strokeWidth={2}
            />
            <text
              x={margin.left + plotWidth - 4}
              y={fiY - 6}
              textAnchor="end"
              className="fill-red-500 text-[10px] font-medium"
            >
              FI target
            </text>
          </>
        )}

        {/* Net worth line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />

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
        {xTicks.map((age) => (
          <text
            key={`xl-${age}`}
            x={xScale(age)}
            y={margin.top + plotHeight + 14}
            textAnchor="middle"
            className="fill-gray-500 text-[9px]"
          >
            {age}
          </text>
        ))}
        <text
          x={margin.left + plotWidth / 2}
          y={viewBoxHeight - 6}
          textAnchor="middle"
          className="fill-gray-400 text-[9px] font-medium"
        >
          Age
        </text>

        {/* Hover highlight */}
        {hoverRow && (
          <>
            <line
              x1={xScale(hoverRow.age)}
              y1={margin.top}
              x2={xScale(hoverRow.age)}
              y2={margin.top + plotHeight}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <circle
              cx={xScale(hoverRow.age)}
              cy={yScale(hoverRow.endBalance)}
              r={4}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoverRow && (
        <div className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] rounded px-2 py-1.5 shadow-lg pointer-events-none">
          <div className="font-semibold">Age {hoverRow.age} ({hoverRow.year})</div>
          <div className="text-gray-300">{formatMoney(hoverRow.endBalance)}</div>
        </div>
      )}
    </div>
  );
}

export default function CompoundCalculatorPage() {
  const currentYear = new Date().getFullYear();
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);

  const [principal, setPrincipal] = useState<string>(() =>
    loadStringSetting("principal", "10000")
  );
  const [contribution, setContribution] = useState<string>(() =>
    loadStringSetting("contribution", "1000")
  );
  const [contributionFreq, setContributionFreq] = useState<Frequency>(() =>
    loadFreqSetting("contributionFreq", "monthly")
  );
  const [returnRate, setReturnRate] = useState<string>(() =>
    loadStringSetting("returnRate", "8")
  );
  const [returnFreq, setReturnFreq] = useState<Frequency>(() =>
    loadFreqSetting("returnFreq", "annual")
  );
  const [currentAge, setCurrentAge] = useState<string>(() =>
    loadStringSetting("currentAge", "30")
  );
  const [targetAge, setTargetAge] = useState<string>(() =>
    loadStringSetting("targetAge", "65")
  );
  const [annualSpend, setAnnualSpend] = useState<string>(() =>
    loadStringSetting("annualSpend", "50000")
  );
  const [withdrawalRate, setWithdrawalRate] = useState<string>(() =>
    loadStringSetting("withdrawalRate", "4")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const settings = {
      principal,
      contribution,
      contributionFreq,
      returnRate,
      returnFreq,
      currentAge,
      targetAge,
      annualSpend,
      withdrawalRate,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [
    principal,
    contribution,
    contributionFreq,
    returnRate,
    returnFreq,
    currentAge,
    targetAge,
    annualSpend,
    withdrawalRate,
  ]);

  const principalNum = parseNum(principal);
  const contributionNum = parseNum(contribution);
  const returnRateNum = parseNum(returnRate);
  const currentAgeNum = clampAge(parseNum(currentAge));
  const targetAgeNum = clampAge(parseNum(targetAge));
  const annualSpendNum = parseNum(annualSpend);
  const withdrawalRateNum = parseNum(withdrawalRate);

  const annualContribution = useMemo(
    () => contributionNum * (contributionFreq === "monthly" ? 12 : 1),
    [contributionNum, contributionFreq]
  );

  const effectiveAnnualReturn = useMemo(() => {
    const r = returnRateNum / 100;
    if (returnFreq === "monthly") {
      return Math.pow(1 + r / 12, 12) - 1;
    }
    return r;
  }, [returnRateNum, returnFreq]);

  const fiNumber = useMemo(() => {
    const rate = withdrawalRateNum / 100;
    return rate > 0 ? annualSpendNum / rate : 0;
  }, [annualSpendNum, withdrawalRateNum]);

  const rows: YearRow[] = useMemo(() => {
    const startAge = currentAgeNum;
    const endAge = Math.min(100, Math.max(targetAgeNum, startAge + 30));

    const result: YearRow[] = [];
    let balance = principalNum;

    for (let age = startAge; age <= endAge; age++) {
      const startBalance = balance;
      const returns = startBalance * effectiveAnnualReturn;
      const endBalance = startBalance + annualContribution + returns;

      result.push({
        age,
        year: currentYear + (age - startAge),
        startBalance,
        contribution: annualContribution,
        returns,
        endBalance,
      });

      balance = endBalance;
    }

    return result;
  }, [principalNum, currentAgeNum, targetAgeNum, annualContribution, effectiveAnnualReturn, currentYear]);

  const crossover = useMemo(() => {
    return rows.find((row) => row.endBalance >= fiNumber) || null;
  }, [rows, fiNumber]);

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
    if (hoveredAge == null) return;
    const row = rowRefs.current[hoveredAge];
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredAge]);

  const inputBase =
    "w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Calculator size={16} className="text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Compound & Financial Independence Calculator
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <PiggyBank size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Inputs</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Initial principal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Contribution
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={contribution}
                      onChange={(e) => setContribution(e.target.value)}
                      className={inputBase}
                    />
                    <div className="flex rounded border border-gray-300 overflow-hidden shrink-0">
                      <button
                        onClick={() => setContributionFreq("monthly")}
                        className={`text-[10px] font-medium px-2.5 py-1.5 transition-colors ${
                          contributionFreq === "monthly"
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        /mo
                      </button>
                      <button
                        onClick={() => setContributionFreq("annual")}
                        className={`text-[10px] font-medium px-2.5 py-1.5 transition-colors ${
                          contributionFreq === "annual"
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        /yr
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Expected annual return (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={returnRate}
                      onChange={(e) => setReturnRate(e.target.value)}
                      className={inputBase}
                    />
                    <div className="flex rounded border border-gray-300 overflow-hidden shrink-0">
                      <button
                        onClick={() => setReturnFreq("annual")}
                        className={`text-[10px] font-medium px-2.5 py-1.5 transition-colors ${
                          returnFreq === "annual"
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        annual
                      </button>
                      <button
                        onClick={() => setReturnFreq("monthly")}
                        className={`text-[10px] font-medium px-2.5 py-1.5 transition-colors ${
                          returnFreq === "monthly"
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        monthly
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {returnFreq === "monthly"
                      ? `Effective annual return: ${(effectiveAnnualReturn * 100).toFixed(2)}%`
                      : "Compounded annually"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      Current age
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={currentAge}
                      onChange={(e) => setCurrentAge(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                      Target age
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={targetAge}
                      onChange={(e) => setTargetAge(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Annual retirement spending
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={annualSpend}
                    onChange={(e) => setAnnualSpend(e.target.value)}
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">
                    Safe withdrawal rate (%)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={withdrawalRate}
                    onChange={(e) => setWithdrawalRate(e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-red-500" />
                <h2 className="text-sm font-bold text-gray-900">FI Target</h2>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatMoney(fiNumber)}
              </div>
              <p className="text-[11px] text-gray-500">
                Needed to safely withdraw {formatMoney(annualSpendNum)} per year at a {withdrawalRateNum || 0}% withdrawal rate.
              </p>
              {crossover ? (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-[11px] text-green-800 font-medium">
                    Financial independence reached at age {crossover.age} ({crossover.year})
                  </p>
                  <p className="text-[10px] text-green-700 mt-0.5">
                    Net worth: {formatMoney(crossover.endBalance)}
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-[11px] text-amber-800 font-medium">
                    FI not reached within the projected horizon.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chart + Table */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">Net Worth Projection</h2>
              </div>
              <div className="h-[360px]">
                <ProjectionChart
                  rows={rows}
                  fiNumber={fiNumber}
                  hoveredAge={hoveredAge}
                  onHoverAge={setHoveredAge}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Year-by-Year Breakdown</h2>
              <div className="overflow-auto max-h-[420px] rounded border border-gray-200">
                <table className="w-full text-[11px]">
                  <thead ref={theadRef} className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Age</th>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Year #</th>
                      <th className="text-left font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Year</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Start Balance</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Contribution</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">Return</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">End Balance</th>
                      <th className="text-right font-semibold text-gray-700 px-3 py-2 border-b border-gray-200">% to FI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isCrossover = crossover && row.age === crossover.age;
                      const isHovered = hoveredAge === row.age;
                      const pctToFi = fiNumber > 0 ? (row.endBalance / fiNumber) * 100 : 0;
                      return (
                        <tr
                          key={row.age}
                          ref={(el) => {
                            rowRefs.current[row.age] = el;
                          }}
                          onMouseEnter={() => setHoveredAge(row.age)}
                          onMouseLeave={() => setHoveredAge(null)}
                          style={{ scrollMarginTop: headerHeight }}
                          className={`transition-colors ${
                            isHovered ? "bg-blue-50" : isCrossover ? "bg-green-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-900">
                            {row.age}
                            {isCrossover && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-600 text-white">
                                FI
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{row.age - currentAgeNum + 1}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{row.year}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">{formatMoney(row.startBalance)}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-700">{formatMoney(row.contribution)}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-green-600">{formatMoney(row.returns)}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right font-semibold text-gray-900">{formatMoney(row.endBalance)}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-600">{pctToFi.toFixed(1)}%</td>
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
