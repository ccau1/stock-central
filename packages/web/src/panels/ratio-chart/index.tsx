import { useMemo, useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { RatioData, RatioPoint } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1",
];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ViewMode = "ratio" | "sector";

function normalizeYearSeries(points: RatioPoint[]): { date: string; monthFrac: number; pct: number }[] {
  if (points.length === 0) return [];
  const base = points[0].ratio;
  if (base === 0) return points.map((p) => ({ date: p.date, monthFrac: dateToMonthFrac(p.date), pct: 0 }));
  return points.map((p) => ({
    date: p.date,
    monthFrac: dateToMonthFrac(p.date),
    pct: ((p.ratio - base) / base) * 100,
  }));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateToMonthFrac(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const totalDays = daysInMonth(year, month);
  return month + (day - 1) / totalDays;
}

function getYear(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}

export function RatioChartPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const [mode, setMode] = useState<ViewMode>("ratio");

  const { data, loading, error } = usePanelData(
    () => dataApi.getRatios(5, mode),
    [refreshKey, mode]
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? yearOptions[0];

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  const filtered = data?.map((ratio: RatioData, index: number) => ({
    name: ratio.name,
    color: COLORS[index % COLORS.length],
    points: normalizeYearSeries(
      ratio.points.filter((p) => getYear(p.date) === activeYear)
    ),
  })) || [];

  const normalized = filtered.filter((s) => s.points.length > 0);

  const allPcts = normalized.flatMap((s) => s.points.map((p) => p.pct));
  const minPct = Math.min(...allPcts, 0);
  const maxPct = Math.max(...allPcts, 0);
  const rangePct = maxPct - minPct || 1;

  const chartW = 300;
  const chartH = 150;
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const scaleX = (monthFrac: number) => padLeft + (monthFrac / 12) * plotW;
  const scaleY = (pct: number) => padTop + ((maxPct - pct) / rangePct) * plotH;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {normalized.length > 0 || loading ? (
          <>
            {/* Mode + Year selector */}
            <div className="flex items-center justify-center gap-2 px-3 pb-2">
              <div className="flex items-center gap-1">
                {(["ratio", "sector"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors capitalize ${
                      m === mode
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="w-px h-3 bg-gray-300" />
              <div className="flex items-center gap-1">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      year === activeYear
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = padTop + t * plotH;
                  return <line key={t} x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
                })}

                {/* Zero line */}
                {minPct < 0 && maxPct > 0 && (
                  <line
                    x1={padLeft}
                    y1={scaleY(0)}
                    x2={chartW - padRight}
                    y2={scaleY(0)}
                    stroke="#d1d5db"
                    strokeWidth="0.8"
                    strokeDasharray="3,2"
                  />
                )}

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const val = maxPct - t * rangePct;
                  const y = padTop + t * plotH;
                  return (
                    <text key={t} x={padLeft - 3} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                      {val >= 0 ? "+" : ""}{val.toFixed(0)}%
                    </text>
                  );
                })}

                {/* X-axis grid lines at month boundaries */}
                {Array.from({ length: 13 }, (_, i) => i).map((i) => {
                  const x = scaleX(i);
                  return <line key={i} x1={x} y1={padTop} x2={x} y2={chartH - padBottom} stroke="#f9fafb" strokeWidth="0.5" />;
                })}

                {/* X-axis month labels (every 2 months) */}
                {[0, 2, 4, 6, 8, 10].map((month) => {
                  const x = scaleX(month + 0.5);
                  return (
                    <text key={month} x={x} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                      {MONTH_LABELS[month]}
                    </text>
                  );
                })}

                {/* Data series */}
                {normalized.map((series) => {
                  const pathD = series.points
                    .map((p, i: number) => `${i === 0 ? "M" : "L"} ${scaleX(p.monthFrac)} ${scaleY(p.pct)}`)
                    .join(" ");
                  const lastPt = series.points[series.points.length - 1];
                  return (
                    <g key={series.name}>
                      <path d={pathD} fill="none" stroke={series.color} strokeWidth="1.2" strokeLinejoin="round" />
                      {lastPt && (
                        <>
                          <circle cx={scaleX(lastPt.monthFrac)} cy={scaleY(lastPt.pct)} r="2.5" fill={series.color} />
                          <text
                            x={scaleX(lastPt.monthFrac) + 5}
                            y={scaleY(lastPt.pct) + 3}
                            fontSize="7"
                            fill={series.color}
                            fontWeight="500"
                          >
                            {series.name}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400">
            No data for {activeYear}
          </div>
        )}
      </div>
    </PanelContainer>
  );
}

export const ratioChartPanel: PanelDefinition = {
  id: "ratio-chart",
  name: "Intermarket Comparison",
  description: "Compare intermarket ratios or individual sector performance over time. Toggle between Ratio and Sector views.",
  categories: ["macro"],
  component: RatioChartPanel,
  filterConfig: { tickerMode: "none" },
};
