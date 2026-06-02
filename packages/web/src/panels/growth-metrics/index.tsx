import { useState } from "react";
import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import type { ForwardPeData } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function GrowthMetricsPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols, refreshKey]
  );
  const [mode, setMode] = useState<"eps" | "revenue">("eps");

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const growthValue = (d: ForwardPeData) => (mode === "eps" ? d.eps_growth : d.revenue_growth);
  const maxGrowth = Math.max(...(data?.map((d) => Math.abs(growthValue(d))) || [0.01]), 0.01);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-gray-400">Source: Yahoo Finance</div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "eps" | "revenue")}
          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="eps">EPS Growth</option>
          <option value="revenue">Revenue Growth</option>
        </select>
      </div>
      <div className="space-y-3">
        {data?.map((d, i) => {
          const val = growthValue(d);
          const isNegative = val < 0;
          return (
            <div key={d.symbol}>
              <div className="flex items-center gap-2 mb-0.5">
                <Link to={`/ticker/${d.symbol}`} className="w-12 text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                  {d.symbol}
                </Link>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all absolute top-0"
                    style={{
                      left: isNegative ? `${50 - (Math.abs(val) / maxGrowth) * 50}%` : "50%",
                      width: `${(Math.abs(val) / maxGrowth) * 50}%`,
                      backgroundColor: isNegative ? "#ef4444" : colors[i % colors.length],
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300" />
                </div>
                <div className={`w-14 text-xs font-bold text-right ${isNegative ? "text-red-600" : "text-green-600"}`}>
                  {(val * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
        {data?.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">No growth data available.</div>
        )}
      </div>
    </PanelContainer>
  );
}

export const growthMetricsPanel: PanelDefinition = {
  id: "growth-metrics",
  name: "Growth Metrics",
  description: "Compare estimated EPS and revenue growth across tickers.",
  categories: ["generic"],
  component: GrowthMetricsPanel,
  filterConfig: { tickerMode: "enabled" },
  preview: () => import("./preview").then((m) => m.default),
};
