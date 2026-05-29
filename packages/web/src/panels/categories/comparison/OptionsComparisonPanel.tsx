import { Link } from "react-router-dom";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { OptionsData } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function OptionsComparisonPanel({ title, tickers, refreshKey, onRefresh, description }: PanelProps) {
  const symbols = tickers ?? [];
  const { data, loading, error } = usePanelData<OptionsData[]>(
    () => dataApi.getOptions(symbols),
    [symbols.join(","), refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  const items = (data || []).filter((d) => symbols.includes(d.symbol));

  if (items.length === 0) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
        {error && <PanelError message={error} />}
        <div className="text-xs text-gray-400">No options data available</div>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const totalVol = item.call_volume + item.put_volume;
          const totalOI = item.call_oi + item.put_oi;
          const callVolPct = totalVol > 0 ? (item.call_volume / totalVol) * 100 : 0;
          const putVolPct = totalVol > 0 ? (item.put_volume / totalVol) * 100 : 0;
          const callOIPct = totalOI > 0 ? (item.call_oi / totalOI) * 100 : 0;
          const putOIPct = totalOI > 0 ? (item.put_oi / totalOI) * 100 : 0;

          return (
            <div key={item.symbol} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <Link to={`/ticker/${item.symbol}`} className="text-sm font-bold text-gray-900 hover:text-blue-700 transition-colors">
                  {item.symbol}
                </Link>
              </div>

              <div className="space-y-3">
                {/* Volume Ratio */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Volume Ratio (P/C)</span>
                    <span className={`text-xs font-bold ${item.put_call_volume_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                      {item.put_call_volume_ratio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${callVolPct}%` }} />
                    <div className="h-full bg-red-500" style={{ width: `${putVolPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-gray-400">C {formatCompact(item.call_volume)}</span>
                    <span className="text-[9px] text-gray-400">P {formatCompact(item.put_volume)}</span>
                  </div>
                </div>

                {/* OI Ratio */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">OI Ratio (P/C)</span>
                    <span className={`text-xs font-bold ${item.put_call_oi_ratio > 1 ? "text-red-600" : "text-green-600"}`}>
                      {item.put_call_oi_ratio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${callOIPct}%` }} />
                    <div className="h-full bg-red-500" style={{ width: `${putOIPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-gray-400">C {formatCompact(item.call_oi)}</span>
                    <span className="text-[9px] text-gray-400">P {formatCompact(item.put_oi)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export const optionsComparisonPanel: PanelDefinition = {
  id: "options-comparison",
  name: "Put/Call Comparison",
  description: "Compare put/call volume and open interest ratios across selected tickers.",
  category: "comparison",
  component: OptionsComparisonPanel,
  filterConfig: { tickerMode: "enabled" },
};
