import { useEffect, useState, useRef } from "react";
import { RefreshCw, ChevronDown, LayoutGrid, List } from "lucide-react";
import { dataApi } from "../lib/api";
import type { HeatmapData, HeatmapUniverse } from "../lib/api";
import StockTreemap from "../components/StockTreemap";

export default function HeatmapPage() {
  const [universe, setUniverse] = useState<string>("sp500");
  const [groupBy, setGroupBy] = useState<"sector" | "industry">("industry");
  const [universes, setUniverses] = useState<HeatmapUniverse[]>([]);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dataApi.getHeatmapUniverses().then(setUniverses).catch(() => {
      setUniverses([
        { id: "sp500", name: "S&P 500 Index" },
        { id: "nasdaq100", name: "Nasdaq 100 Index" },
        { id: "nasdaqComposite", name: "Nasdaq Composite Index" },
        { id: "dowjones30", name: "Dow Jones Industrial Average" },
        { id: "dowjones20", name: "Dow Jones Transportation Average" },
        { id: "dowjones15", name: "Dow Jones Utility Average" },
        { id: "dowjones65", name: "Dow Jones Composite Average" },
        { id: "kbwBank", name: "KBW NASDAQ Bank Index" },
        { id: "russell1000", name: "Russell 1000 Index" },
        { id: "russell2000", name: "Russell 2000 Index" },
        { id: "russell3000", name: "Russell 3000 Index" },
        { id: "allUS", name: "All US companies" },
      ]);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchHeatmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dataApi.getHeatmap(universe, groupBy);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [universe, groupBy]);

  const selectedName = universes.find((u) => u.id === universe)?.name || universe;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Heatmap</h1>
          <p className="text-xs text-gray-500 mt-0.5">Market-cap weighted performance by {groupBy}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universe dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{selectedName}</span>
              <ChevronDown size={12} />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {universes.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUniverse(u.id);
                      setShowDropdown(false);
                    }}
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

          {/* Group by toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 py-1">
            <button
              onClick={() => setGroupBy("sector")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "sector" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
              title="Sector"
            >
              <LayoutGrid size={12} />
              <span className="hidden sm:inline">Sector</span>
            </button>
            <button
              onClick={() => setGroupBy("industry")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "industry" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
              title="Industry"
            >
              <List size={12} />
              <span className="hidden sm:inline">Industry</span>
            </button>
          </div>

          <button
            onClick={fetchHeatmap}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            title="Refresh"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Heatmap */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[400px]">
        {loading && !data ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            <RefreshCw size={16} className="animate-spin mr-2" />
            Loading heatmap…
          </div>
        ) : data ? (
          <StockTreemap data={data} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
