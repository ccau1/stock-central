import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { dataApi } from "../lib/api";
import type { ScreenStock, HeatmapUniverse } from "../lib/api";

type SortKey = keyof ScreenStock;
type SortDir = "asc" | "desc";

interface Filters {
  minMarketCap: string;
  maxMarketCap: string;
  minTrailingPE: string;
  maxTrailingPE: string;
  minForwardPE: string;
  maxForwardPE: string;
  minDivYield: string;
  maxDivYield: string;
  minChangePct: string;
  maxChangePct: string;
  min52wRange: string;
  max52wRange: string;
  sector: string;
}

const defaultFilters: Filters = {
  minMarketCap: "",
  maxMarketCap: "",
  minTrailingPE: "",
  maxTrailingPE: "",
  minForwardPE: "",
  maxForwardPE: "",
  minDivYield: "",
  maxDivYield: "",
  minChangePct: "",
  maxChangePct: "",
  min52wRange: "",
  max52wRange: "",
  sector: "",
};

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

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v}`;
}

function pct(val: number): string {
  if (val === 0 || !isFinite(val)) return "–";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

function num(val: number, digits = 1): string {
  if (val === 0 || !isFinite(val)) return "–";
  return val.toFixed(digits);
}

export default function ScreenerPage() {
  const navigate = useNavigate();
  const [universe, setUniverse] = useState<string>("sp500");
  const [data, setData] = useState<ScreenStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUniverseDropdown, setShowUniverseDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
      const result = await dataApi.getScreen(universe);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [universe]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => { if (d.sector) set.add(d.sector); });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let rows = [...data];

    const minCap = parseFloat(filters.minMarketCap);
    const maxCap = parseFloat(filters.maxMarketCap);
    if (!isNaN(minCap)) rows = rows.filter((r) => r.market_cap >= minCap * 1e9);
    if (!isNaN(maxCap)) rows = rows.filter((r) => r.market_cap <= maxCap * 1e9);

    const minTPE = parseFloat(filters.minTrailingPE);
    const maxTPE = parseFloat(filters.maxTrailingPE);
    if (!isNaN(minTPE)) rows = rows.filter((r) => r.trailing_pe > 0 && r.trailing_pe >= minTPE);
    if (!isNaN(maxTPE)) rows = rows.filter((r) => r.trailing_pe > 0 && r.trailing_pe <= maxTPE);

    const minFPE = parseFloat(filters.minForwardPE);
    const maxFPE = parseFloat(filters.maxForwardPE);
    if (!isNaN(minFPE)) rows = rows.filter((r) => r.forward_pe > 0 && r.forward_pe >= minFPE);
    if (!isNaN(maxFPE)) rows = rows.filter((r) => r.forward_pe > 0 && r.forward_pe <= maxFPE);

    const minDiv = parseFloat(filters.minDivYield);
    const maxDiv = parseFloat(filters.maxDivYield);
    if (!isNaN(minDiv)) rows = rows.filter((r) => r.dividend_yield > 0 && r.dividend_yield * 100 >= minDiv);
    if (!isNaN(maxDiv)) rows = rows.filter((r) => r.dividend_yield > 0 && r.dividend_yield * 100 <= maxDiv);

    const minChg = parseFloat(filters.minChangePct);
    const maxChg = parseFloat(filters.maxChangePct);
    if (!isNaN(minChg)) rows = rows.filter((r) => r.change_percent >= minChg);
    if (!isNaN(maxChg)) rows = rows.filter((r) => r.change_percent <= maxChg);

    const min52 = parseFloat(filters.min52wRange);
    const max52 = parseFloat(filters.max52wRange);
    if (!isNaN(min52) || !isNaN(max52)) {
      rows = rows.filter((r) => {
        if (r.fifty_two_week_high <= 0 || r.price <= 0) return false;
        const rangePct = (r.price / r.fifty_two_week_high) * 100;
        if (!isNaN(min52) && rangePct < min52) return false;
        if (!isNaN(max52) && rangePct > max52) return false;
        return true;
      });
    }

    if (filters.sector) {
      rows = rows.filter((r) => r.sector === filters.sector);
    }

    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av || "").toLowerCase();
      const bs = String(bv || "").toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    return rows;
  }, [data, filters, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const selectedName = universes.find((u) => u.id === universe)?.name || universe;

  const filterInput = (
    label: string,
    minKey: keyof Filters,
    maxKey: keyof Filters,
    placeholderMin = "Min",
    placeholderMax = "Max"
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder={placeholderMin}
          value={filters[minKey]}
          onChange={(e) => setFilters((f) => ({ ...f, [minKey]: e.target.value }))}
        />
        <span className="text-gray-300 text-[10px]">-</span>
        <input
          type="number"
          className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder={placeholderMax}
          value={filters[maxKey]}
          onChange={(e) => setFilters((f) => ({ ...f, [maxKey]: e.target.value }))}
        />
      </div>
    </div>
  );

  const columns: { key: SortKey; label: string; align?: "left" | "right"; w?: string }[] = [
    { key: "symbol", label: "Symbol", align: "left", w: "w-16" },
    { key: "name", label: "Name", align: "left", w: "w-32" },
    { key: "sector", label: "Sector", align: "left", w: "w-28" },
    { key: "price", label: "Price", align: "right", w: "w-16" },
    { key: "change_percent", label: "Chg %", align: "right", w: "w-16" },
    { key: "market_cap", label: "Mkt Cap", align: "right", w: "w-20" },
    { key: "trailing_pe", label: "Trail P/E", align: "right", w: "w-16" },
    { key: "forward_pe", label: "Fwd P/E", align: "right", w: "w-16" },
    { key: "dividend_yield", label: "Div Yld", align: "right", w: "w-16" },
    { key: "fifty_two_week_high", label: "52W Hi", align: "right", w: "w-16" },
    { key: "fifty_two_week_low", label: "52W Lo", align: "right", w: "w-16" },
    { key: "volume", label: "Volume", align: "right", w: "w-20" },
  ];

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Screener</h1>
          <span className="text-xs text-gray-500">{filtered.length} results</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Universe dropdown */}
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
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                      u.id === universe ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showFilters ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Filter size={12} />
            Filters
          </button>

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

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filterInput("Market Cap ($B)", "minMarketCap", "maxMarketCap")}
          {filterInput("Trailing P/E", "minTrailingPE", "maxTrailingPE")}
          {filterInput("Forward P/E", "minForwardPE", "maxForwardPE")}
          {filterInput("Div Yield (%)", "minDivYield", "maxDivYield")}
          {filterInput("Change %", "minChangePct", "maxChangePct")}
          {filterInput("52W Range (% of high)", "min52wRange", "max52wRange", "0", "100")}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-gray-500">Sector</label>
            <select
              className="text-[11px] border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              value={filters.sector}
              onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
            >
              <option value="">All</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ ...defaultFilters })}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-800 px-2 py-1"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none ${col.align === "right" ? "text-right" : "text-left"} ${col.w || ""}`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                      ) : (
                        <ArrowUpDown size={10} className="text-gray-300" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                    No stocks match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.symbol}
                    onClick={() => navigate(`/ticker/${row.symbol}`)}
                    className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-1.5 font-semibold text-gray-800">{row.symbol}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{row.name}</td>
                    <td className="px-2 py-1.5 text-gray-500">{row.sector || "–"}</td>
                    <td className="px-2 py-1.5 text-right text-gray-700">${num(row.price, 2)}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${row.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {pct(row.change_percent)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-600">{formatMarketCap(row.market_cap)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">{num(row.trailing_pe, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">{num(row.forward_pe, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">{row.dividend_yield > 0 ? `${(row.dividend_yield * 100).toFixed(2)}%` : "–"}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">${num(row.fifty_two_week_high, 2)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">${num(row.fifty_two_week_low, 2)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600">{formatVolume(row.volume)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
