import { useEffect, useRef, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { PanelProps, PanelDefinition } from "../../core/types";
import { dataApi } from "../../../lib/api";
import type { HeatmapUniverse } from "../../../lib/api";
import StockTreemap from "../../../components/StockTreemap";
import { PanelContainer, PanelError, PanelLoading, usePanelData } from "../../core";

export function StockHeatmapPanel({ title, inputs, refreshKey, onRefresh, description }: PanelProps) {
  const [universe, setUniverse] = useState<string>(inputs.universe || "sp500");
  const [groupBy, setGroupBy] = useState<"sector" | "industry">("industry");
  const [universes, setUniverses] = useState<HeatmapUniverse[]>([]);
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

  const { data, loading, error } = usePanelData(
    () => dataApi.getHeatmap(universe, groupBy),
    [refreshKey, universe, groupBy]
  );

  const selectedName = universes.find((u) => u.id === universe)?.name || universe;

  if (loading && !data) return <PanelContainer title={title} onRefresh={onRefresh} loading={true} description={description} noPadding><PanelLoading /></PanelContainer>;

  return (
    <PanelContainer title={title} onRefresh={onRefresh} loading={loading} description={description} noPadding>
      {error && <PanelError message={error} />}
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-2 mb-2 shrink-0 px-3 pt-3">
          <div className="relative flex items-center gap-1" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <span className="truncate max-w-[160px]">{selectedName}</span>
              <ChevronDown size={12} />
            </button>
            <HelpCircle size={10} className="text-gray-400 cursor-help" data-tooltip-id="filter-tooltip" data-tooltip-content="The stock index or universe displayed in the heatmap." />
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
          <div className="flex items-center bg-gray-100 rounded-md">
            <button
              onClick={() => setGroupBy("sector")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "sector" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sector
            </button>
            <button
              onClick={() => setGroupBy("industry")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                groupBy === "industry" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Industry
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          {data ? (
            <StockTreemap data={data} />
          ) : (
            <PanelLoading />
          )}
        </div>
      </div>
    </PanelContainer>
  );
}

export const stockHeatmapPanel: PanelDefinition = {
  id: "stock-heatmap",
  name: "Stock Heatmap",
  description: "Nasdaq 100 treemap weighted by market cap. Size represents weight; color represents performance.",
  category: "macro",
  component: StockHeatmapPanel,
  filterConfig: { tickerMode: "none" },
};
