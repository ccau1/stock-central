import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, normalizeRatioSeries, usePanelData } from "../../core";

const RATIO_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function RatioChartPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getRatios(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const normalized = data?.map((ratio: any) => ({
    name: ratio.name,
    color: RATIO_COLORS[data.indexOf(ratio) % RATIO_COLORS.length],
    points: normalizeRatioSeries(ratio.points),
  })) || [];

  const allPcts = normalized.flatMap((s: any) => s.points.map((p: any) => p.pct));
  const minPct = Math.min(...allPcts, 0);
  const maxPct = Math.max(...allPcts, 0);
  const rangePct = maxPct - minPct || 1;

  const maxLen = Math.max(...normalized.map((s: any) => s.points.length), 0);

  const chartW = 300;
  const chartH = 150;
  const padLeft = 32;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const scaleX = (i: number) => padLeft + (i / (maxLen - 1 || 1)) * plotW;
  const scaleY = (pct: number) => padTop + ((maxPct - pct) / rangePct) * plotH;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="h-full">
        {normalized.length > 0 ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padTop + t * plotH;
              return <line key={t} x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
            })}

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

            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = maxPct - t * rangePct;
              const y = padTop + t * plotH;
              return (
                <text key={t} x={padLeft - 3} y={y + 3} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {val >= 0 ? "+" : ""}{val.toFixed(0)}%
                </text>
              );
            })}

            {normalized[0]?.points && (
              <>
                <text x={padLeft} y={chartH - 4} textAnchor="start" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={padLeft + plotW / 2} y={chartH - 4} textAnchor="middle" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[Math.floor((normalized[0].points.length - 1) / 2)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
                <text x={chartW - padRight} y={chartH - 4} textAnchor="end" fontSize="6" fill="#9ca3af">
                  {new Date(normalized[0].points[normalized[0].points.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              </>
            )}

            {normalized.map((series: any) => {
              const pathD = series.points
                .map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.pct)}`)
                .join(" ");
              const lastPt = series.points[series.points.length - 1];
              return (
                <g key={series.name}>
                  <path d={pathD} fill="none" stroke={series.color} strokeWidth="1.2" strokeLinejoin="round" />
                  {lastPt && (
                    <>
                      <circle cx={scaleX(series.points.length - 1)} cy={scaleY(lastPt.pct)} r="2.5" fill={series.color} />
                      <text
                        x={scaleX(series.points.length - 1) + 5}
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
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const ratioChartPanel: PanelDefinition = {
  id: "ratio-chart",
  name: "Ratio Chart",
  description: "Intermarket ratio performance (e.g., cyclicals vs defensives). Divergences can signal shifting economic regimes.",
  category: "macro",
  component: RatioChartPanel,
  filterConfig: { tickerMode: "none" },
};
