import { useEffect, useState } from "react";
import { Skull, Percent } from "lucide-react";
import { dataApi } from "../lib/api";
import type { ScreenStock } from "../lib/api";
import TechnicalSummary, { useTechnicalSummary } from "./TechnicalSummary";

interface ComparisonMetricsBarProps {
  tickers: string[];
  enabledTickers: string[];
}

function TickerMetricCard({
  sym,
  isEnabled,
  quote,
}: {
  sym: string;
  isEnabled: boolean;
  quote: ScreenStock | undefined;
}) {
  useTechnicalSummary(sym);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-3 transition-opacity ${
        isEnabled ? "" : "opacity-40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-900">{sym}</span>
        <TechnicalSummary symbol={sym} compact />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Percent size={10} />
            Div Yield
          </span>
          <span className="text-[11px] font-semibold text-gray-800">
            {quote && quote.dividend_yield > 0 ? `${(quote.dividend_yield * 100).toFixed(2)}%` : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Skull size={10} />
            Short % Float
          </span>
          <span
            className={`text-[11px] font-semibold ${
              quote && quote.short_percent_float > 0.2
                ? "text-red-600"
                : quote && quote.short_percent_float > 0.1
                ? "text-amber-600"
                : "text-gray-800"
            }`}
          >
            {quote && quote.short_percent_float > 0
              ? `${(quote.short_percent_float * 100).toFixed(1)}%`
              : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Short Ratio</span>
          <span className="text-[11px] font-semibold text-gray-800">
            {quote && quote.short_ratio > 0 ? quote.short_ratio.toFixed(2) : "–"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonMetricsBar({ tickers, enabledTickers }: ComparisonMetricsBarProps) {
  const [quotes, setQuotes] = useState<ScreenStock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tickers.length === 0) return;
    setLoading(true);
    dataApi
      .getBatchQuotes(tickers)
      .then((data) => {
        setQuotes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tickers.join(",")]);

  if (tickers.length === 0) return null;

  const getQuote = (sym: string) => quotes.find((q) => q.symbol === sym);

  return (
    <div className="px-4 py-2 bg-white border-b border-gray-200 shrink-0">
      <div className="text-[10px] text-gray-500 font-medium mb-2">Snapshot</div>
      {loading && quotes.length === 0 ? (
        <div className="text-xs text-gray-400">Loading metrics...</div>
      ) : (
        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1">
          {tickers.map((sym) => (
            <div key={sym} className="shrink-0 w-52">
              <TickerMetricCard
                sym={sym}
                isEnabled={enabledTickers.includes(sym)}
                quote={getQuote(sym)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
