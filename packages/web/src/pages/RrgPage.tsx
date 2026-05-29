import { useEffect, useState, useRef, useMemo } from "react";
import { RefreshCw, X, Search, Settings2, HelpCircle, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { dataApi } from "../lib/api";
import type { RrgTrail, TickerSearchResult } from "../lib/api";
import { usePersistentTickers } from "../hooks/usePersistentTickers";

const RRG_GROUPS: { label: string; tickers: string[] }[] = [
  { label: "Sectors", tickers: ["XLK", "XLF", "XLE", "XLI", "XLP", "XLU", "XLV", "XLB", "XLRE", "XLC", "SPY"] },
  { label: "AI + Software", tickers: ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "AMD", "CRM", "ADBE", "ORCL", "PLTR", "PANW"] },
  { label: "Commodities", tickers: ["USO", "UNG", "GLD", "SLV", "PPLT", "CPER", "DBB", "DBC", "GDX", "XLE", "BNO"] },
  { label: "Big Tech", tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"] },
  { label: "Financials", tickers: ["JPM", "BAC", "GS", "MS", "WFC", "C", "BLK", "BX", "SPY"] },
  { label: "China Tech", tickers: ["BABA", "JD", "PDD", "TCEHY", "NTES", "BIDU", "NIO", "LI", "XPEV"] },
];

const DEFAULT_ETFS = RRG_GROUPS[0].tickers;
const RRG_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7", "#64748b"];

export default function RrgPage() {
  const { tickers, setTickers, addTicker, removeTicker, clearTickers } = usePersistentTickers("rrg_tickers", DEFAULT_ETFS);
  const [benchmark, setBenchmark] = useState("SPY");
  const [lookback, setLookback] = useState("3m");
  const [trailLength, setTrailLength] = useState(5);
  const [group, setGroup] = useState("Sectors");
  const [disabled, setDisabled] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("rrg_disabled");
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set<string>();
  });
  const [data, setData] = useState<RrgTrail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 800, h: 400 });

  useEffect(() => {
    localStorage.setItem("rrg_disabled", JSON.stringify([...disabled]));
  }, [disabled]);

  useEffect(() => {
    if (!chartRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(() => {
      dataApi.searchTickers(q)
        .then((results) => {
          const filtered = results.filter((r: TickerSearchResult) => !tickers.includes(r.symbol));
          setSearchResults(filtered.slice(0, 8));
          setShowDropdown(filtered.length > 0);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setShowDropdown(false);
          setSearchLoading(false);
        });
    }, 200);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, tickers]);

  const fetchRrg = async () => {
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const rrg = await dataApi.getRrg(tickers, benchmark, lookback, trailLength);
      setData(rrg);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRrg();
  }, [benchmark, lookback, trailLength]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchRrg(), 300);
    return () => clearTimeout(timeout);
  }, [tickers]);

  const handleAddTicker = (symbol: string) => {
    addTicker(symbol);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleRemoveTicker = (symbol: string) => {
    removeTicker(symbol);
    setDisabled((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  };

  const handleTickerClick = (symbol: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.size === 0) {
        // All visible → isolate to clicked ticker only
        tickers.forEach((t) => {
          if (t !== symbol) next.add(t);
        });
      } else {
        // Some hidden → toggle this one
        if (next.has(symbol)) next.delete(symbol);
        else next.add(symbol);
      }
      return next;
    });
  };

  const showAllTickers = () => setDisabled(new Set());
  const hideAllTickers = () => setDisabled(new Set(tickers));

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    tickers.forEach((t, i) => map.set(t, RRG_COLORS[i % RRG_COLORS.length]));
    return map;
  }, [tickers]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relative Rotation Graph</h1>
          <p className="text-xs text-gray-500 mt-0.5">Relative rotation vs {benchmark}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
              <Search size={12} className="text-gray-400 shrink-0" />
              <input
                className="w-24 sm:w-28 bg-transparent text-xs focus:outline-none placeholder:text-gray-300"
                placeholder="Add ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleAddTicker(searchResults[0].symbol);
                  }
                }}
              />
              {searchLoading && <RefreshCw size={10} className="text-gray-400 animate-spin shrink-0" />}
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleAddTicker(r.symbol)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{r.symbol}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{r.name}</div>
                    </div>
                    <div className="text-[10px] text-gray-400">{r.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchRrg}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            title="Refresh"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
          <Settings2 size={12} className="text-gray-400 shrink-0" />
          <span className="hidden sm:inline text-[10px] text-gray-500 font-medium">Benchmark:</span>
          <HelpCircle size={10} className="text-gray-400 cursor-help shrink-0" data-tooltip-id="filter-tooltip" data-tooltip-content="The reference index used to calculate relative strength and momentum for each ticker." />
          <select
            className="text-xs bg-transparent focus:outline-none"
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
          >
            <option value="SPY">SPY</option>
            <option value="QQQ">QQQ</option>
            <option value="IWM">IWM</option>
            <option value="VTI">VTI</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
          <span className="hidden sm:inline text-[10px] text-gray-500 font-medium">Lookback:</span>
          <HelpCircle size={10} className="text-gray-400 cursor-help shrink-0" data-tooltip-id="filter-tooltip" data-tooltip-content="Time period over which relative strength and momentum are calculated." />
          <select
            className="text-xs bg-transparent focus:outline-none"
            value={lookback}
            onChange={(e) => setLookback(e.target.value)}
          >
            <option value="1m">1M</option>
            <option value="3m">3M</option>
            <option value="6m">6M</option>
            <option value="1y">1Y</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
          <span className="hidden sm:inline text-[10px] text-gray-500 font-medium">Trail:</span>
          <HelpCircle size={10} className="text-gray-400 cursor-help shrink-0" data-tooltip-id="filter-tooltip" data-tooltip-content="Number of historical data points shown as a trailing path on the chart." />
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={trailLength}
            onChange={(e) => setTrailLength(Number(e.target.value))}
            className="w-16 sm:w-24 h-1 accent-gray-900 cursor-pointer"
          />
          <span className="text-xs font-medium text-gray-700 w-5 text-right">{trailLength}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
          <span className="hidden sm:inline text-[10px] text-gray-500 font-medium">Group:</span>
          <HelpCircle size={10} className="text-gray-400 cursor-help shrink-0" data-tooltip-id="filter-tooltip" data-tooltip-content="Preset collection of tickers to analyze together." />
          <select
            className="text-xs bg-transparent focus:outline-none"
            value={group}
            onChange={(e) => {
              const g = e.target.value;
              setGroup(g);
              const found = RRG_GROUPS.find((rg) => rg.label === g);
              if (found) setTickers(found.tickers);
            }}
          >
            {RRG_GROUPS.map((g) => (
              <option key={g.label} value={g.label}>{g.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {tickers.map((t) => {
            const isDisabled = disabled.has(t);
            return (
              <span
                key={t}
                onClick={() => handleTickerClick(t)}
                title={isDisabled ? "Click to show" : "Click to toggle visibility"}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded cursor-pointer select-none transition-opacity ${
                  isDisabled
                    ? "bg-gray-100 text-gray-400 line-through opacity-60"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {t}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTicker(t);
                  }}
                  className={`${isDisabled ? "hover:text-gray-600" : "hover:text-blue-900"}`}
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
          {tickers.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={showAllTickers}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                title="Show all"
              >
                <Eye size={10} />
                <span className="hidden sm:inline">All</span>
              </button>
              <button
                onClick={hideAllTickers}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                title="Hide all"
              >
                <EyeOff size={10} />
                <span className="hidden sm:inline">All</span>
              </button>
              <button
                onClick={clearTickers}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                title="Clear all tickers"
              >
                <Trash2 size={10} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red-500 mb-4">{error}</div>}

      {/* RRG Chart */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[400px] relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            <Loader2 size={32} className="text-gray-900 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-700">Loading RRG data...</span>
          </div>
        )}
        <div ref={chartRef} className="h-full p-4">
          {(() => {
            const { w, h } = chartSize;
            const s = Math.min(w, h) / 200;
            const cx = w / 2;
            const cy = h / 2;
            const pad = 10 * s;
            return (
              <svg width={w} height={h} style={{ display: "block" }}>
                {/* Quadrant backgrounds */}
                <rect x={cx} y={0} width={cx} height={cy} fill="#dcfce7" opacity="0.5" />
                <rect x={cx} y={cy} width={cx} height={cy} fill="#fef3c7" opacity="0.5" />
                <rect x={0} y={cy} width={cx} height={cy} fill="#fee2e2" opacity="0.5" />
                <rect x={0} y={0} width={cx} height={cy} fill="#dbeafe" opacity="0.5" />

                {/* Axes */}
                <line x1={cx} y1={pad} x2={cx} y2={h - pad} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />
                <line x1={pad} y1={cy} x2={w - pad} y2={cy} stroke="#9ca3af" strokeWidth={s} strokeDasharray={`${3 * s},${3 * s}`} />

                {/* Axis labels */}
                <text x={cx} y={pad - 2} textAnchor="middle" fontSize={6 * s} fill="#6b7280">RS →</text>
                <text x={w - 4} y={cy} textAnchor="end" fontSize={6 * s} fill="#6b7280" dominantBaseline="middle">RM ↑</text>

                {/* Quadrant Labels */}
                <text x={w * 0.75} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#166534" fontWeight="600">Leading</text>
                <text x={w * 0.75} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#92400e" fontWeight="600">Weakening</text>
                <text x={w * 0.25} y={h - pad - 2 * s} textAnchor="middle" fontSize={9 * s} fill="#991b1b" fontWeight="600">Lagging</text>
                <text x={w * 0.25} y={pad + 8 * s} textAnchor="middle" fontSize={9 * s} fill="#1e40af" fontWeight="600">Improving</text>

                {/* Data */}
                {data?.filter((trail) => !disabled.has(trail.symbol)).map((trail) => {
                  const color = colorMap.get(trail.symbol) ?? RRG_COLORS[0];
                  const points = trail.points;
                  if (points.length === 0) return null;

                  const sx = (rs: number) => pad + (rs / 100) * (w - 2 * pad);
                  const sy = (rm: number) => h - pad - (rm / 100) * (h - 2 * pad);

                  const pathD = points.map((p, i) => {
                    return `${i === 0 ? "M" : "L"} ${sx(p.rs)} ${sy(p.rm)}`;
                  }).join(" ");

                  const current = points[points.length - 1];
                  const curX = sx(current.rs);
                  const curY = sy(current.rm);

                  return (
                    <g key={trail.symbol}>
                      {points.length > 1 && (
                        <path d={pathD} fill="none" stroke={color} strokeWidth={1.2 * s} opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      {points.slice(0, -1).map((p, i) => (
                        <circle key={i} cx={sx(p.rs)} cy={sy(p.rm)} r={1.5 * s} fill={color} opacity={0.3 + (i / points.length) * 0.4} />
                      ))}
                      <circle cx={curX} cy={curY} r={4 * s} fill={color} opacity="0.9" stroke="white" strokeWidth={0.5 * s} />
                      {(() => {
                        const nearRight = curX > w - pad - (w - 2 * pad) * 0.08;
                        const nearTop = curY < pad + (h - 2 * pad) * 0.08;
                        const nearBottom = curY > h - pad - (h - 2 * pad) * 0.08;
                        return (
                          <text
                            x={nearRight ? curX - 5 * s : curX + 5 * s}
                            y={nearTop ? curY + 12 * s : nearBottom ? curY - 6 * s : curY + 3 * s}
                            textAnchor={nearRight ? "end" : "start"}
                            fontSize={7 * s}
                            fill="#1f2937"
                            fontWeight="500"
                          >
                            {trail.symbol}
                          </text>
                        );
                      })()}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
