import { useState } from "react";
import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { ForwardPeData } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function ForwardPePanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols, refreshKey]
  );
  const [peMode, setPeMode] = useState<"current_fy" | "next_fy">("current_fy");

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const peValue = (d: ForwardPeData) => peMode === "current_fy" ? d.forward_pe : d.forward_pe_next_fy;
  const epsValue = (d: ForwardPeData) => peMode === "current_fy" ? d.forward_eps : d.forward_eps_next_fy;
  const maxPe = Math.max(...(data?.map(peValue) || [1]), 1);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-gray-400">Source: Yahoo Finance</div>
        <select
          value={peMode}
          onChange={(e) => setPeMode(e.target.value as "current_fy" | "next_fy")}
          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="current_fy">Current FY</option>
          <option value="next_fy">Next FY</option>
        </select>
      </div>
      <div className="space-y-3">
        {data?.map((d, i) => (
          <div key={d.symbol}>
            <div className="flex items-center gap-2 mb-0.5">
              <Link to={`/ticker/${d.symbol}`} className="w-12 text-xs font-semibold text-gray-700 hover:text-blue-700 transition-colors">
                {d.symbol}
              </Link>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(peValue(d) / maxPe) * 100}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
              <div className="w-10 text-xs font-bold text-gray-700 text-right">{peValue(d)}x</div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-14">
              <span>trailing {d.trailing_pe > 0 ? d.trailing_pe + "x" : "–"}</span>
              <span>fwd EPS ${epsValue(d) > 0 ? epsValue(d).toFixed(2) : "–"}</span>
            </div>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}

export const forwardPePanel: PanelDefinition = {
  id: "forward-pe",
  name: "Forward PE Ratio",
  description: "Compare forward PE ratios across tickers.",
  category: "generic",
  component: ForwardPePanel,
  filterConfig: { tickerMode: "enabled" },
};
