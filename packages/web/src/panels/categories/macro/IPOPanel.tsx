import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

function formatLargeNum(n: number): string {
  if (!n || n === 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function biddingLabel(status: string): string {
  switch (status) {
    case "This Week":
      return "Pricing imminent";
    case "Next Week":
      return "Book-building";
    default:
      return "Filing / Roadshow";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "This Week":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Next Week":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function IPOPanel({ title, refreshKey, onRefresh, description }: PanelProps) {
  const { data, loading, error } = usePanelData(
    () => dataApi.getIPOs(5),
    [refreshKey]
  );

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description}><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description}>
      {error && <PanelError message={error} />}
      {data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((ipo: any) => (
            <div key={ipo.symbol} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{ipo.symbol}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${statusColor(ipo.status)}`}>
                      {ipo.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">{ipo.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-gray-800">
                    {new Date(ipo.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <div className="text-[9px] text-gray-400">{ipo.exchange}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span className="text-gray-500">
                  {ipo.price_range ? `Price: ${ipo.price_range}` : "Price: TBD"}
                </span>
                <span className="text-gray-400 italic">
                  {biddingLabel(ipo.status)}
                </span>
              </div>
              {(ipo.deal_size > 0 || ipo.market_cap > 0) && (
                <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-400">
                  {ipo.deal_size > 0 && <span>Deal: {formatLargeNum(ipo.deal_size)}</span>}
                  {ipo.market_cap > 0 && <span>Mkt Cap: {formatLargeNum(ipo.market_cap)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <PanelLoading />
      )}
    </PanelContainer>
  );
}

export const ipoPanel: PanelDefinition = {
  id: "ipo-calendar",
  name: "IPO Calendar",
  description: "Top upcoming IPOs with launch dates, exchanges, price ranges, and bidding status.",
  category: "macro",
  component: IPOPanel,
  filterConfig: { tickerMode: "none" },
};
