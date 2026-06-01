import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, X, Search, Plus, TrendingUp } from "lucide-react";
import { dataApi } from "../lib/api";
import type { ScreenStock, ForwardPeData } from "../lib/api";
import { useTickerSearch } from "../hooks/useTickerSearch";

const STORAGE_KEY = "stockcentral_watchlist";

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
}

function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function saveWatchlist(symbols: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<string[]>(readWatchlist);
  const [quotes, setQuotes] = useState<ScreenStock[]>([]);
  const [forwardPe, setForwardPe] = useState<Record<string, ForwardPeData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const search = useTickerSearch({
    existingTickers: symbols,
    onSelect: (symbol: string) => {
      if (!symbols.includes(symbol)) {
        const next = [...symbols, symbol];
        setSymbols(next);
        saveWatchlist(next);
      }
      search.setSearchQuery("");
      search.setShowDropdown(false);
    },
  });

  const fetchData = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes([]);
      setForwardPe({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [quotesResult, peResult] = await Promise.all([
        dataApi.getBatchQuotes(symbols),
        dataApi.getForwardPe(symbols),
      ]);
      setQuotes(quotesResult);
      const peMap: Record<string, ForwardPeData> = {};
      peResult.forEach((p) => { peMap[p.symbol] = p; });
      setForwardPe(peMap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = (symbol: string) => {
    const next = symbols.filter((s) => s !== symbol);
    setSymbols(next);
    saveWatchlist(next);
  };

  // Actually, getScreen doesn't support custom symbol lists. I need to modify the backend
  // to support a `symbols` param on the screen endpoint, OR add a new batch-quotes endpoint.
  // The cleanest approach: modify getScreen to accept `?symbols=AAPL,MSFT` as an override.
  // Let me do that now.

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Watchlist</h1>
          <p className="text-xs text-gray-500 mt-0.5">{symbols.length} tickers</p>
        </div>
        <div className="flex items-center gap-2">
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 w-48">
              <Search size={12} className="text-gray-400 shrink-0" />
              <input
                className="bg-transparent text-xs focus:outline-none placeholder:text-gray-400 w-full"
                placeholder="Add ticker..."
                value={search.searchQuery}
                onChange={(e) => search.setSearchQuery(e.target.value.toUpperCase())}
                onFocus={() => { if (search.searchResults.length > 0) search.setShowDropdown(true); }}
                onKeyDown={search.handleKeyDown}
              />
            </div>
            {search.showDropdown && search.searchResults.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {search.searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => search.handleSelect(r.symbol)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{r.symbol}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{r.name}</div>
                    </div>
                    <Plus size={12} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {symbols.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <TrendingUp size={32} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Your watchlist is empty</p>
          <p className="text-xs text-gray-400 mt-1">Search for tickers above to add them</p>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto min-h-0">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 border-b border-gray-200 text-left">Symbol</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-b border-gray-200 text-left">Name</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right">Price</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right">Chg %</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right">Mkt Cap</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right">Fwd P/E</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-right">Next Earnings</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-left">Sector</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {loading && quotes.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400"><RefreshCw size={16} className="animate-spin inline mr-2" />Loading…</td></tr>
              ) : (
                symbols.map((sym) => {
                  const q = quotes.find((x) => x.symbol === sym);
                  const pe = forwardPe[sym];
                  return (
                    <tr
                      key={sym}
                      onClick={() => navigate(`/ticker/${sym}`)}
                      className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800">{sym}</td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[160px]">{q?.name || "–"}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{q ? `$${q.price.toFixed(2)}` : "–"}</td>
                      <td className={`px-2 py-2 text-right font-medium ${q && q.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {q ? `${q.change_percent >= 0 ? "+" : ""}${q.change_percent.toFixed(1)}%` : "–"}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">{q ? formatMarketCap(q.market_cap) : "–"}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{pe && pe.forward_pe > 0 ? pe.forward_pe.toFixed(1) : "–"}</td>
                      <td className="px-2 py-2 text-right text-gray-600">
                        {pe && pe.next_earnings_date ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${pe.next_earnings_time === "Pre-market" ? "bg-orange-50 text-orange-700" : "bg-purple-50 text-purple-700"}`}>
                            {new Date(pe.next_earnings_date * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-2 py-2 text-gray-500">{q?.sector || "–"}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(sym); }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
