import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";

function signalColor(signal: string) {
  switch (signal) {
    case "extreme": return "bg-purple-50 border-purple-200 text-purple-700";
    case "high": return "bg-red-50 border-red-200 text-red-700";
    case "moderate": return "bg-amber-50 border-amber-200 text-amber-700";
    default: return "bg-green-50 border-green-200 text-green-700";
  }
}

function signalIcon(signal: string) {
  switch (signal) {
    case "extreme": return <Flame size={14} className="text-purple-500" />;
    case "high": return <Flame size={14} className="text-red-500" />;
    case "moderate": return <TrendingUp size={14} className="text-amber-500" />;
    default: return <TrendingDown size={14} className="text-green-500" />;
  }
}

export function MarketFrothPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getFroth(),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const score = data?.froth_score ?? 0;
  const scoreColor = score >= 75 ? "text-purple-600" : score >= 50 ? "text-red-600" : score >= 25 ? "text-amber-600" : "text-green-600";
  const scoreBg = score >= 75 ? "bg-purple-100" : score >= 50 ? "bg-red-100" : score >= 25 ? "bg-amber-100" : "bg-green-100";

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-2">
        {/* Froth Score Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-gray-500">Froth Level</div>
            <div className={`text-xl font-bold ${scoreColor}`}>{data?.froth_label ?? "—"}</div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreBg}`}>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}</span>
          </div>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-1 gap-1.5">
          {data?.indicators.map((ind) => (
            <div key={ind.name} className={`rounded-md border px-2 py-1.5 ${signalColor(ind.signal)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {signalIcon(ind.signal)}
                  <span className="text-xs font-medium">{ind.name}</span>
                </div>
                <span className="text-xs font-bold">{ind.value}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] opacity-80">{ind.description}</span>
                <span className={`text-[10px] font-medium ${ind.change_1m >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {ind.change_1m >= 0 ? "+" : ""}{ind.change_1m.toFixed(2)} 1m
                </span>
              </div>
            </div>
          ))}
        </div>

        {!data?.indicators.length && <PanelLoading />}
      </div>
    </PanelContainer>
  );
}

export const marketFrothPanel: PanelDefinition = {
  id: "market-froth",
  name: "Market Froth",
  description: "Speculative froth indicators including ARKK momentum, crypto proxy, tech concentration, VIX complacency, and retail participation.",
  category: "macro",
  component: MarketFrothPanel,
  filterConfig: { tickerMode: "none" },
};
