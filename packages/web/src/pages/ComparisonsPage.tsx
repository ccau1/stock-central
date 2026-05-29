import { useState, useEffect } from "react";
import { RefreshCw, X, Search, Eye, EyeOff, Trash2, Lock, Unlock, HelpCircle } from "lucide-react";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { useDisabledTickers } from "../hooks/useDisabledTickers";
import { useEditMode } from "../hooks/useEditMode";
import DashboardGrid from "../components/DashboardGrid";
import comparisonsYaml from "../comparisons.yaml?raw";

const STATIC_DASHBOARD = parseDashboardYaml(comparisonsYaml);

export const RANGE_OPTIONS = ["ytd", "yoy", "1m", "3m", "6m", "1y", "5y"] as const;
export type TimeRange = (typeof RANGE_OPTIONS)[number];

export const RANGE_LABELS: Record<TimeRange, string> = {
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  ytd: "YTD",
  yoy: "YoY",
  "5y": "5Y",
};

export default function ComparisonsPage() {
  const {
    dashboard,
    tickers,
    globalRefreshKey,
    panelRefreshKeys,
    initDashboard,
    refreshAll,
    refreshPanel,
    addTicker,
    removeTicker,
    clearTickers,
    updatePanelLayouts,
  } = useDashboard("comparisons");

  useEffect(() => {
    initDashboard(STATIC_DASHBOARD);
  }, [initDashboard]);

  const [timeRange, setTimeRange] = useState<TimeRange>("1y");

  const {
    disabledTickers,
    handleTickerClick,
    showAll,
    hideAll,
    remove: removeDisabled,
    enabledTickers,
  } = useDisabledTickers("comparisons_disabled_tickers");

  const { isEditMode, setIsEditMode } = useEditMode("comparisons_edit_mode");

  const search = useTickerSearch({
    existingTickers: tickers,
    onSelect: addTicker,
  });

  const handleRemoveTicker = (symbol: string) => {
    removeTicker(symbol);
    removeDisabled(symbol);
  };

  const enabled = enabledTickers(tickers);

  if (!dashboard) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium">Range:</span>
            <HelpCircle size={10} className="text-gray-400 cursor-help" data-tooltip-id="filter-tooltip" data-tooltip-content="Time period for price history, performance metrics, and chart data." />
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                  timeRange === r
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Search */}
          <div ref={search.searchRef} className="relative">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
              <Search size={12} className="text-gray-400" />
              <input
                className="w-28 bg-transparent text-xs focus:outline-none placeholder:text-gray-300"
                placeholder="Add ticker..."
                value={search.searchQuery}
                onChange={(e) => search.setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.searchResults.length > 0) {
                    search.handleSelect(search.searchResults[0].symbol);
                  }
                }}
              />
              {search.searchLoading && <RefreshCw size={10} className="text-gray-400 animate-spin" />}
            </div>
            {search.showDropdown && search.searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
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
                    <div className="text-[10px] text-gray-400">{r.exchange}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit mode toggle */}
          <button
            onClick={() => setIsEditMode((prev: boolean) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isEditMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={isEditMode ? "Disable edit mode" : "Enable edit mode"}
          >
            {isEditMode ? <Unlock size={12} /> : <Lock size={12} />}
            {isEditMode ? "Edit On" : "Edit Off"}
          </button>

          <button
            onClick={refreshAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </header>

      {/* Ticker pills */}
      <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="text-[10px] text-gray-500 font-medium mr-1">Tickers:</span>
        {tickers.map((t) => {
          const isDisabled = disabledTickers.has(t);
          return (
            <span
              key={t}
              onClick={() => handleTickerClick(t, tickers)}
              title={isDisabled ? "Click to show" : "Click to toggle visibility"}
              className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded cursor-pointer select-none transition-opacity ${
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
                className={isDisabled ? "hover:text-gray-600" : "hover:text-blue-900"}
                title="Remove"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
        {tickers.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={showAll}
              className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
              title="Show all"
            >
              <Eye size={10} />
              All
            </button>
            <button
              onClick={() => hideAll(tickers)}
              className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
              title="Hide all"
            >
              <EyeOff size={10} />
              All
            </button>
            <button
              onClick={clearTickers}
              className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
              title="Clear all tickers"
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>
        )}
      </div>

      <DashboardGrid
        panels={dashboard.panels}
        filters={{ tickers, enabledTickers: enabled, timeRange }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
        onLayoutChange={updatePanelLayouts}
        isEditMode={isEditMode}
        panelWrapperClassName="h-full w-full"
      />
    </div>
  );
}
