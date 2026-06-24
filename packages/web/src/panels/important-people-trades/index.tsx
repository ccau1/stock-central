import { useState } from "react";
import { Landmark, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../_core/types";
import { dataApi } from "../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../_core";

function formatValue(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ImportantPeopleTradesPanel({ title, refreshKey, onRefresh, onExpand, description }: PanelProps) {
  const [filter, setFilter] = useState<string>("all");
  const { data, loading, error } = usePanelData(
    () => dataApi.getImportantPeopleTrades(),
    [refreshKey]
  );

  if (loading && !data) {
    return (
      <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={true} description={description}>
        <PanelLoading />
      </PanelContainer>
    );
  }

  const trades = data ?? [];
  const people = Array.from(new Set(trades.map((t) => t.person)));
  const filtered = filter === "all" ? trades : trades.filter((t) => t.person === filter);

  return (
    <PanelContainer title={title} onRefresh={onRefresh} onExpand={onExpand} loading={loading} description={description}>
      {error && <PanelError message={error} />}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap px-3 pt-3 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
            filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {people.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
              filter === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 space-y-2 max-h-96 overflow-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-gray-400 py-4 text-center">No trades found.</div>
        )}
        {filtered.map((trade, i) => (
          <div
            key={`${trade.ticker}-${trade.date}-${i}`}
            className="bg-gray-50 rounded-lg border border-gray-100 p-3"
          >
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">{trade.ticker}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      trade.action === "Buy"
                        ? "text-green-700 bg-green-100"
                        : trade.action === "Sell"
                        ? "text-red-700 bg-red-100"
                        : "text-gray-700 bg-gray-100"
                    }`}
                  >
                    {trade.action === "Buy" ? (
                      <ArrowUpRight size={10} />
                    ) : trade.action === "Sell" ? (
                      <ArrowDownRight size={10} />
                    ) : (
                      <Minus size={10} />
                    )}
                    {trade.action}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">{trade.company}</div>
              </div>
              <a
                href={trade.filing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600"
                title="View filing"
              >
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-1.5">
              <div>
                <div className="text-[9px] text-gray-400">Shares</div>
                <div className="text-[11px] font-semibold text-gray-800">{formatShares(trade.shares)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400">Value</div>
                <div className="text-[11px] font-semibold text-gray-800">{formatValue(trade.value)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400">Date</div>
                <div className="text-[11px] font-semibold text-gray-800">
                  {new Date(trade.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Landmark size={10} className="text-gray-400" />
                <span className="text-[10px] font-medium text-gray-600">{trade.person}</span>
                <span className="text-[9px] text-gray-400">• {trade.person_title}</span>
              </div>
            </div>
            {trade.notes && (
              <div className="text-[9px] text-gray-400 mt-1 italic">{trade.notes}</div>
            )}
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}

export const importantPeopleTradesPanel: PanelDefinition = {
  id: "important-people-trades",
  name: "Important People Trades",
  description: "Track latest publicly disclosed trades by notable figures like Buffett, Pelosi, and Trump.",
  categories: ["generic"],
  component: ImportantPeopleTradesPanel,
  filterConfig: { tickerMode: "none" },
};
