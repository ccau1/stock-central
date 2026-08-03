import { useRef, useState } from "react";
import type { ForwardPeData, UpcomingQuarterlyEarning } from "../lib/api";
import { useSvgContainerSize } from "../hooks/useSvgContainerSize";
import { CheckCircle2, XCircle, MinusCircle, CalendarClock } from "lucide-react";

interface EarningsHistoryProps {
  forwardPe: ForwardPeData;
}

function formatEps(n: number): string {
  if (n == null || Number.isNaN(n)) return "–";
  return `$${n.toFixed(2)}`;
}

interface ChartPoint {
  label: string;
  actual: number | null;
  estimate: number | null;
  isUpcoming: boolean;
}

function buildUpcomingList(forwardPe: ForwardPeData): UpcomingQuarterlyEarning[] {
  const explicit = forwardPe.earnings_upcoming || [];
  if (explicit.length > 0) return explicit;

  // Fallback: Yahoo sometimes provides the upcoming quarter as the last entry
  // in earningsChart.quarterly. In that case quarter_label is the upcoming
  // quarter and eps_estimate_q is its estimate. Only use this fallback when
  // quarter_label is NOT already a reported quarter, to avoid duplicating the
  // last reported quarter's estimate as a fabricated "next" quarter.
  const lastLabel = forwardPe.quarter_label;
  const nextEstimate = forwardPe.eps_estimate_q;
  if (nextEstimate > 0 && lastLabel) {
    const history = forwardPe.earnings_history || [];
    const isReported = history.some((q) => q.date === lastLabel);
    if (!isReported) {
      return [{ date: lastLabel, estimate: nextEstimate }];
    }
  }
  return [];
}

function buildChartPoints(forwardPe: ForwardPeData): ChartPoint[] {
  const history = forwardPe.earnings_history || [];
  const chronological = history.slice(-8);
  const points: ChartPoint[] = chronological.map((q) => ({
    label: q.date,
    actual: q.actual,
    estimate: q.estimate,
    isUpcoming: false,
  }));

  const upcoming = buildUpcomingList(forwardPe);
  const lastHistoryLabel = chronological.length > 0 ? chronological[chronological.length - 1].date : "";

  for (const u of upcoming) {
    // Avoid duplicating a quarter already in the reported history
    if (u.date === lastHistoryLabel) continue;
    points.push({
      label: u.date,
      actual: null,
      estimate: u.estimate,
      isUpcoming: true,
    });
  }

  return points;
}

const ACTUAL_COLOR = "#2563eb"; // blue-600
const ESTIMATE_COLOR = "#f59e0b"; // amber-500

function EarningsLineChart({ points }: { points: ChartPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: containerRef, size } = useSvgContainerSize(800, 220);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const estimates = points.map((p) => p.estimate).filter((v): v is number => v != null);
  const actuals = points.map((p) => p.actual).filter((v): v is number => v != null);
  const allValues = [...estimates, ...actuals];
  if (allValues.length === 0) return null;

  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const rangeY = maxY - minY || 1;
  // Add padding so points aren't touching edges
  const paddedMin = minY - rangeY * 0.12;
  const paddedMax = maxY + rangeY * 0.12;
  const paddedRange = paddedMax - paddedMin || 1;

  const W = size.width;
  const H = size.height;
  const padL = 48;
  const padR = 16;
  const padT = 12;
  const padB = 36;
  const gw = Math.max(W - padL - padR, 0);
  const gh = Math.max(H - padT - padB, 0);

  const n = points.length;
  const xScale = n > 1 ? gw / (n - 1) : gw / 2;

  const toSvg = (x: number, y: number) => ({
    sx: padL + x * xScale,
    sy: padT + (paddedMax - y) * (gh / paddedRange),
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || n <= 1 || W <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round((svgX - padL) / xScale);
    if (idx < 0) idx = 0;
    if (idx >= n) idx = n - 1;
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const buildPath = (values: (number | null)[]) => {
    let d = "";
    values.forEach((v, i) => {
      if (v == null) return;
      const { sx, sy } = toSvg(i, v);
      d += `${d ? " L" : "M"} ${sx} ${sy}`;
    });
    return d;
  };

  const actualPath = buildPath(points.map((p) => p.actual));
  const estimatePath = buildPath(points.map((p) => p.estimate));

  const gridLines = 3;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => paddedMin + (paddedRange * i) / gridLines);

  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className="flex flex-col h-64 mb-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 px-4 pt-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: ACTUAL_COLOR }} />
          Actual EPS
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
          <span
            className="w-3 h-0.5 rounded-full"
            style={{
              backgroundColor: ESTIMATE_COLOR,
              backgroundImage: `repeating-linear-gradient(90deg, ${ESTIMATE_COLOR}, ${ESTIMATE_COLOR} 4px, transparent 4px, transparent 7px)`,
              height: "2px",
            }}
          />
          Estimate EPS
        </span>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          {gridYs.map((y, i) => {
            const { sy } = toSvg(0, y);
            return (
              <g key={i}>
                <line x1={padL} y1={sy} x2={W - padR} y2={sy} stroke="#e5e7eb" strokeWidth="1" />
                <text x={padL - 8} y={sy + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {y.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Zero line */}
          {paddedMin < 0 && paddedMax > 0 && (
            <line
              x1={padL}
              y1={toSvg(0, 0).sy}
              x2={W - padR}
              y2={toSvg(0, 0).sy}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}

          {/* Estimate line (dashed) */}
          {estimatePath && (
            <path
              d={estimatePath}
              fill="none"
              stroke={ESTIMATE_COLOR}
              strokeWidth="2"
              strokeDasharray="5,4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {/* Actual line (solid) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke={ACTUAL_COLOR}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots */}
          {points.map((p, i) => {
            const est = p.estimate != null ? toSvg(i, p.estimate) : null;
            const act = p.actual != null ? toSvg(i, p.actual) : null;
            return (
              <g key={i}>
                {est && (
                  <circle
                    cx={est.sx}
                    cy={est.sy}
                    r={p.isUpcoming ? 5 : 3.5}
                    fill="#fff"
                    stroke={ESTIMATE_COLOR}
                    strokeWidth="2"
                  />
                )}
                {act && (
                  <circle
                    cx={act.sx}
                    cy={act.sy}
                    r={3.5}
                    fill={ACTUAL_COLOR}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {points.map((p, i) => {
            const { sx } = toSvg(i, 0);
            return (
              <text
                key={`label-${i}`}
                x={sx}
                y={H - padB + 14}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize="9"
                fill="#6b7280"
              >
                {p.label}
              </text>
            );
          })}

          {/* Hover vertical line */}
          {hoverIndex != null && (
            <line
              x1={toSvg(hoverIndex, 0).sx}
              y1={padT}
              x2={toSvg(hoverIndex, 0).sx}
              y2={H - padB}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity={0.8}
            />
          )}
        </svg>
      </div>

      {/* Hover tooltip panel */}
      <div
        className="mt-2 pt-2 border-t border-gray-100 min-h-[2.5rem] transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {hovered && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] text-gray-500 font-medium">{hovered.label}</span>
            {hovered.actual != null && (
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACTUAL_COLOR }} />
                <span className="text-gray-600">Actual:</span>
                <span className="font-semibold text-gray-800">{formatEps(hovered.actual)}</span>
              </span>
            )}
            {hovered.estimate != null && (
              <span className="flex items-center gap-1 text-[11px]">
                <span
                  className="w-2 h-2 rounded-full border-2"
                  style={{ borderColor: ESTIMATE_COLOR, backgroundColor: "transparent" }}
                />
                <span className="text-gray-600">Estimate:</span>
                <span className="font-semibold text-gray-800">{formatEps(hovered.estimate)}</span>
                {hovered.isUpcoming && (
                  <span className="text-[9px] text-amber-600 font-medium ml-1">(upcoming)</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EarningsHistory({ forwardPe }: EarningsHistoryProps) {
  const history = forwardPe.earnings_history || [];
  const upcomingList = buildUpcomingList(forwardPe);
  if (history.length === 0 && upcomingList.length === 0) return null;

  // Show the most recent 8 reported quarters, latest first
  const recentHistory = history.slice(-8).reverse();
  const chartPoints = buildChartPoints(forwardPe);

  const beats = recentHistory.filter((q) => q.actual > q.estimate).length;
  const misses = recentHistory.filter((q) => q.actual < q.estimate).length;
  const inline = recentHistory.length - beats - misses;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">Earnings vs. Estimates</h2>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          {beats > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} className="text-green-600" />
              {beats} beat{beats !== 1 ? "s" : ""}
            </span>
          )}
          {misses > 0 && (
            <span className="flex items-center gap-1">
              <XCircle size={10} className="text-red-600" />
              {misses} miss{misses !== 1 ? "es" : ""}
            </span>
          )}
          {inline > 0 && (
            <span className="flex items-center gap-1">
              <MinusCircle size={10} className="text-gray-400" />
              {inline} inline
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Chart */}
        {chartPoints.length >= 2 && <EarningsLineChart points={chartPoints} />}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Quarter
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Actual EPS
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Estimate EPS
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Surprise
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Surprise %
                </th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = [];
                // Show furthest-future upcoming quarter first, then nearer ones
                [...upcomingList].reverse().forEach((u, i) => {
                  rows.push(
                    <tr key={`upcoming-${i}`} className="border-t border-gray-100 bg-amber-50/40 hover:bg-amber-50/60">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock size={12} className="text-amber-600" />
                          <span>{u.date}</span>
                        </div>
                        {i === 0 && forwardPe.next_earnings_time && (
                          <div className="text-[9px] text-amber-600 font-medium ml-5">
                            {forwardPe.next_earnings_time}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-400">–</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-700 font-medium">
                        {formatEps(u.estimate)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-400">–</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-400">–</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-100">
                          Expected
                        </span>
                      </td>
                    </tr>
                  );
                });
                recentHistory.forEach((q, i) => {
                  const surprise = q.actual - q.estimate;
                  const isBeat = q.actual > q.estimate;
                  const isMiss = q.actual < q.estimate;
                  const resultColor = isBeat ? "text-green-600" : isMiss ? "text-red-600" : "text-gray-500";
                  const resultBg = isBeat ? "bg-green-50" : isMiss ? "bg-red-50" : "bg-gray-100";
                  const resultLabel = isBeat ? "Beat" : isMiss ? "Miss" : "Inline";
                  rows.push(
                    <tr
                      key={`${q.date}-${i}`}
                      className="border-t border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{q.date}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-700">{formatEps(q.actual)}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-500">{formatEps(q.estimate)}</td>
                      <td className={`px-4 py-2.5 text-xs text-right font-medium ${resultColor}`}>
                        {surprise >= 0 ? "+" : ""}
                        {formatEps(surprise).replace("$", "")}
                      </td>
                      <td className={`px-4 py-2.5 text-xs text-right font-medium ${resultColor}`}>
                        {q.beat_pct >= 0 ? "+" : ""}
                        {q.beat_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${resultColor} ${resultBg}`}
                        >
                          {resultLabel}
                        </span>
                      </td>
                    </tr>
                  );
                });
                return rows;
              })()}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
          Last {recentHistory.length} quarters of reported EPS versus analyst estimates. Surprise % is
          calculated as (actual − estimate) ÷ |estimate|. Upcoming estimates are shown when available.
        </p>
      </div>
    </div>
  );
}
