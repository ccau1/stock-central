import { useState, useMemo } from "react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";
import {
  getEarningsSessionKey,
  formatUsClockTime,
  formatUsDateShort,
} from "../../lib/usTime";

const PRESETS = [
  { label: "$50B", value: 50_000_000_000 },
  { label: "$100B", value: 100_000_000_000 },
  { label: "$200B", value: 200_000_000_000 },
  { label: "$500B", value: 500_000_000_000 },
  { label: "$1T", value: 1_000_000_000_000 },
];

function formatLargeNum(n: number): string {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatDate(ts: number, time: string): string {
  return formatUsDateShort(getEarningsSessionKey(ts, time));
}

function timeBadgeClass(time: string): string {
  if (time === "Pre-market") return "bg-amber-100 text-amber-700 border-amber-200";
  if (time === "After-hours") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

export function UpcomingEarningsPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const [minMarketCap, setMinMarketCap] = useState<number>(100_000_000_000);

  const { data, loading, error } = usePanelData(
    () => dataApi.getUpcomingEarnings(minMarketCap),
    [refreshKey, minMarketCap]
  );

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data>();
    for (const item of data) {
      const dateKey = getEarningsSessionKey(item.earnings_date, item.earnings_time);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}

      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[10px] text-gray-500">Min Cap:</span>
        <select
          value={minMarketCap}
          onChange={(e) => setMinMarketCap(Number(e.target.value))}
          className="text-[10px] py-0.5 px-1 rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {grouped.length > 0 ? (
        <div className="space-y-3 overflow-y-auto pr-1 max-h-[35vh] md:max-h-[calc(100%_-_22px)]">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {formatDate(items[0].earnings_date, items[0].earnings_time)}
              </div>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between gap-2 bg-gray-50 rounded-md px-2 py-1.5 border border-gray-100"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">{item.symbol}</span>
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded border font-medium ${timeBadgeClass(
                            item.earnings_time
                          )}`}
                        >
                          {formatUsClockTime(item.earnings_date) || item.earnings_time || "TBD"}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">{item.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-semibold text-gray-700">
                        {formatLargeNum(item.market_cap)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-4">No upcoming earnings match the filter.</div>
      )}
    </PanelContainer>
  );
}

export const upcomingEarningsPanel: PanelDefinition = {
  id: "upcoming-earnings",
  name: "Upcoming Earnings",
  description: "Upcoming earnings calendar for large-cap stocks with market cap filtering.",
  categories: ["macro"],
  component: UpcomingEarningsPanel,
  filterConfig: { tickerMode: "none" },
};
