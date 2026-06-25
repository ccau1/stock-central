import { useLayoutEffect, useRef, useState } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function EquityRiskPremiumPanel({
  title,
  refreshKey,
  onRefresh,
  onExpand,
  description,
}: PanelProps) {
  const [maturity, setMaturity] = useState<"10y" | "30y">("10y");
  const { data, loading, error } = usePanelData(
    () => dataApi.getEquityRiskPremium(maturity),
    [refreshKey, maturity]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 300, h: 150 });

  useLayoutEffect(() => {
    if (!chartRef.current) return;
    const el = chartRef.current;
    setChartSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (loading && !data) {
    return (
      <PanelContainer
        title={title}
        onRefresh={onRefresh}
        onExpand={onExpand}
        loading={true}
        description={description}
      >
        <PanelLoading />
      </PanelContainer>
    );
  }

  const history = data?.history ?? [];
  const current = data?.current ?? 0;
  const earningsYield = data?.earnings_yield ?? 0;
  const riskFreeRate = data?.risk_free_rate ?? 0;
  const forwardPE = data?.forward_pe ?? 0;
  const treasuryLabel = maturity === "30y" ? "30Y Treasury" : "10Y Treasury";

  const chartW = chartSize.w || 300;
  const chartH = chartSize.h || 150;
  const padLeft = 40;
  const padRight = 4;
  const padTop = 6;
  const padBottom = 18;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const premiums = history.map((d) => d.premium);
  let minY = premiums.length ? Math.min(...premiums) : 0;
  let maxY = premiums.length ? Math.max(...premiums) : 1;
  // Keep zero in view so positive/negative spreads are obvious.
  minY = Math.min(0, minY);
  maxY = Math.max(0, maxY);
  const rangeY = maxY - minY || 1;

  const scaleX = (i: number) => padLeft + (i / ((history.length || 1) - 1 || 1)) * plotW;
  const scaleY = (y: number) => padTop + ((maxY - y) / rangeY) * plotH;

  let premiumPath = "";
  history.forEach((d, i) => {
    const cmd = premiumPath ? " L" : "M";
    premiumPath += `${cmd} ${scaleX(i)} ${scaleY(d.premium)}`;
  });

  const zeroY = scaleY(0);

  let premiumColor: string;
  if (current <= 0) premiumColor = "text-red-600";
  else if (current < 1) premiumColor = "text-amber-600";
  else premiumColor = "text-green-600";

  return (
    <PanelContainer
      title={title}
      onRefresh={onRefresh}
      onExpand={onExpand}
      loading={loading}
      description={description}
    >
      {error && <PanelError message={error} />}
      <div className="h-full flex flex-col">
        {/* Main metric */}
        <div className="flex items-end gap-3 px-1 mb-2">
          <div>
            <div className="text-[10px] text-gray-400">Equity Risk Premium</div>
            <div className={`text-2xl font-bold ${premiumColor}`}>
              {current >= 0 ? "+" : ""}
              {current.toFixed(2)}%
            </div>
          </div>
          <div className="text-[10px] text-gray-400 pb-1">
            P/E: {data?.pe_source ?? "—"} · {treasuryLabel}: {data?.source ?? "—"}
          </div>
          <div className="ml-auto flex items-center bg-gray-100 rounded p-0.5">
            <button
              type="button"
              onClick={() => setMaturity("10y")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                maturity === "10y"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              10Y
            </button>
            <button
              type="button"
              onClick={() => setMaturity("30y")}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                maturity === "30y"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              30Y
            </button>
          </div>
        </div>

        {/* Supporting metrics */}
        <div className="grid grid-cols-3 gap-2 px-1 mb-2">
          <div>
            <div className="text-[10px] text-gray-400">Earnings Yield</div>
            <div className="text-sm font-semibold text-gray-700">
              {earningsYield.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">{treasuryLabel}</div>
            <div className="text-sm font-semibold text-gray-700">
              {riskFreeRate.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">Forward P/E</div>
            <div className="text-sm font-semibold text-gray-700">
              {forwardPE > 0 ? `${forwardPE.toFixed(1)}x` : "—"}
            </div>
          </div>
        </div>

        {/* Chart */}
        {history.length > 0 ? (
          <div ref={chartRef} className="flex-1 min-h-0 relative max-md:min-h-[200px]">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padTop + t * plotH;
                return (
                  <line
                    key={t}
                    x1={padLeft}
                    y1={y}
                    x2={chartW - padRight}
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Zero line */}
              {zeroY >= padTop && zeroY <= chartH - padBottom && (
                <line
                  x1={padLeft}
                  y1={zeroY}
                  x2={chartW - padRight}
                  y2={zeroY}
                  stroke="#9ca3af"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              )}

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = maxY - t * rangeY;
                const y = padTop + t * plotH;
                return (
                  <text
                    key={t}
                    x={padLeft - 3}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="6"
                    fill="#9ca3af"
                  >
                    {val.toFixed(1)}%
                  </text>
                );
              })}

              {/* Axis lines */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={chartH - padBottom}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <line
                x1={padLeft}
                y1={chartH - padBottom}
                x2={chartW - padRight}
                y2={chartH - padBottom}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />

              {/* X-axis date labels */}
              <text
                x={padLeft}
                y={chartH - 4}
                textAnchor="start"
                fontSize="6"
                fill="#9ca3af"
              >
                {new Date(history[0].date).toLocaleDateString(undefined, {
                  month: "short",
                  year: "2-digit",
                })}
              </text>
              <text
                x={padLeft + plotW / 2}
                y={chartH - 4}
                textAnchor="middle"
                fontSize="6"
                fill="#9ca3af"
              >
                {new Date(history[Math.floor((history.length - 1) / 2)].date).toLocaleDateString(
                  undefined,
                  { month: "short", year: "2-digit" }
                )}
              </text>
              <text
                x={chartW - padRight}
                y={chartH - 4}
                textAnchor="end"
                fontSize="6"
                fill="#9ca3af"
              >
                {new Date(history[history.length - 1].date).toLocaleDateString(undefined, {
                  month: "short",
                  year: "2-digit",
                })}
              </text>

              {/* Premium line */}
              <path
                d={premiumPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <PanelLoading />
        )}
      </div>
    </PanelContainer>
  );
}

export const equityRiskPremiumPanel: PanelDefinition = {
  id: "equity-risk-premium",
  name: "Equity Risk Premium",
  description:
    "S&P 500 earnings yield minus the selected Treasury yield (toggle between 10-year and 30-year). Above zero, stocks offer extra return over risk-free bonds. Below zero, bonds yield more than stocks' expected earnings, so equities are offering little or no compensation for taking equity risk.",
  categories: ["macro"],
  component: EquityRiskPremiumPanel,
  filterConfig: { tickerMode: "none" },
};
