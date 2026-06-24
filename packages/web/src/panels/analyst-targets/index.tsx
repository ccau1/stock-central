import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

export function AnalystTargetsPanel({ title, tickers, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData(
    () => dataApi.getForwardPe(symbols),
    [symbols.join(","), refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const items = (data || []).filter((d) => symbols.includes(d.symbol));

  if (items.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No analyst data available</div>
      </PanelContainer>
    );
  }

  const recColors: Record<string, string> = {
    strong_buy: "bg-green-600",
    buy: "bg-green-500",
    hold: "bg-yellow-500",
    underperform: "bg-orange-500",
    sell: "bg-red-500",
  };

  const recLabels: Record<string, string> = {
    strong_buy: "Strong Buy",
    buy: "Buy",
    hold: "Hold",
    underperform: "Underperform",
    sell: "Sell",
  };

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="space-y-4 overflow-auto h-full">
        {items.map((d) => {
          const price = d.forward_pe > 0 && d.forward_eps > 0 ? d.forward_pe * d.forward_eps : 0;
          const low = d.target_low;
          const mean = d.target_mean;
          const high = d.target_high;
          const hasTargets = low > 0 && mean > 0 && high > 0;
          const rec = d.recommendation;
          const recColor = recColors[rec] || "bg-gray-400";
          const recLabel = recLabels[rec] || rec || "N/A";

          return (
            <div key={d.symbol} className="border border-gray-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">{d.symbol}</span>
                <span className={`text-[10px] font-semibold text-white px-1.5 py-0.5 rounded ${recColor}`}>
                  {recLabel}
                </span>
              </div>

              {hasTargets && price > 0 ? (
                <>
                  <div className="relative h-3 bg-gray-100 rounded-full mb-1.5">
                    <div
                      className="absolute top-0 bottom-0 bg-blue-100 rounded-full"
                      style={{ left: `${((low - low) / (high - low)) * 100}%`, right: `${100 - ((high - low) / (high - low)) * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-blue-400 rounded-full"
                      style={{ left: `${((mean - low) / (high - low)) * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-800 rounded-full border border-white"
                      style={{ left: `${Math.min(Math.max(((price - low) / (high - low)) * 100, 0), 100)}%` }}
                      title={`Current: $${price.toFixed(2)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Low ${low.toFixed(1)}</span>
                    <span>Mean ${mean.toFixed(1)}</span>
                    <span>High ${high.toFixed(1)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Current ${price.toFixed(2)} · {d.num_analyst_opinions} analysts
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-400">No target data</div>
              )}
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

export const analystTargetsPanel: PanelDefinition = {
  id: "analyst-targets",
  name: "Analyst Targets",
  description: "Price target range and consensus recommendation from analysts.",
  categories: ["generic"],
  component: AnalystTargetsPanel,
  filterConfig: { tickerMode: "enabled" },
};
