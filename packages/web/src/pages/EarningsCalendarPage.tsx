import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ChevronDown, Calendar } from "lucide-react";
import { dataApi } from "../lib/api";
import type { UpcomingEarningsEntry, HeatmapUniverse } from "../lib/api";

const universeFallbacks: HeatmapUniverse[] = [
  { id: "sp500", name: "S&P 500" },
  { id: "nasdaq100", name: "Nasdaq 100" },
  { id: "dowjones30", name: "Dow Jones 30" },
  { id: "russell1000", name: "Russell 1000" },
  { id: "russell2000", name: "Russell 2000" },
  { id: "kbwBank", name: "KBW Bank" },
];

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
}

function daysUntil(ts: number): string {
  const now = Date.now();
  const diff = ts * 1000 - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Today";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function EarningsCalendarPage() {
  const navigate = useNavigate();
  const [universe, setUniverse] = useState<string>("sp500");
  const [minMarketCap, setMinMarketCap] = useState<string>("");
  const [data, setData] = useState<UpcomingEarningsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUniverseDropdown, setShowUniverseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const universes = universeFallbacks;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUniverseDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cap = minMarketCap === "" ? undefined : parseFloat(minMarketCap) * 1e9;
      const result = await dataApi.getUpcomingEarnings(cap, universe, 200);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [universe, minMarketCap]);

  const grouped = useMemo(() => {
    const map = new Map<string, UpcomingEarningsEntry[]>();
    data.forEach((d) => {
      const dateKey = formatDate(d.earnings_date);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const at = a[1][0]?.earnings_date ?? 0;
      const bt = b[1][0]?.earnings_date ?? 0;
      return at - bt;
    });
  }, [data]);

  const selectedName = universes.find((u) => u.id === universe)?.name || universe;

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Earnings Calendar</h1>
          <span className="text-xs text-gray-500">{data.length} upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUniverseDropdown(!showUniverseDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="truncate max-w-[120px]">{selectedName}</span>
              <ChevronDown size={12} />
            </button>
            {showUniverseDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {universes.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setUniverse(u.id); setShowUniverseDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${u.id === universe ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            placeholder="Min Mkt Cap ($B)"
            className="w-28 text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={minMarketCap}
            onChange={(e) => setMinMarketCap(e.target.value)}
          />
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

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto min-h-0">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading earnings…
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No upcoming earnings found
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {grouped.map(([date, entries]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                  <Calendar size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-gray-800">{date}</h3>
                  <span className="text-[10px] text-gray-400">{entries.length} stocks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {entries.map((e) => (
                    <button
                      key={e.symbol}
                      onClick={() => navigate(`/ticker/${e.symbol}`)}
                      className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg hover:bg-blue-50/50 hover:border-blue-200 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-800">{e.symbol}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[140px]">{e.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-medium text-gray-600">{formatMarketCap(e.market_cap)}</div>
                        <div className={`text-[10px] ${e.earnings_time === "Pre-market" ? "text-orange-600" : "text-purple-600"}`}>
                          {e.earnings_time || "TBD"}
                        </div>
                        <div className="text-[10px] text-gray-400">{daysUntil(e.earnings_date)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
