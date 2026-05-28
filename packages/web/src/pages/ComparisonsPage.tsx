import { useState, useEffect, useRef, useCallback } from "react";
import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { RefreshCw, X, Search, Eye, EyeOff, HelpCircle } from "lucide-react";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { getPanelType } from "../panel-registry";
import { dataApi } from "../lib/api";
import type { TickerSearchResult } from "../lib/api";
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

function buildResponsiveLayouts(
  panels: Array<{ id: string; layout: { x: number; y: number; w: number; h: number } }>
) {
  const lg = panels.map((p) => ({
    i: p.id,
    x: p.layout.x,
    y: p.layout.y,
    w: p.layout.w,
    h: p.layout.h,
    minW: 2,
    minH: 3,
  }));

  const stack = (cols: number) => {
    let y = 0;
    return panels.map((p) => {
      const item = {
        i: p.id,
        x: 0,
        y,
        w: Math.min(p.layout.w, cols),
        h: p.layout.h,
        minW: Math.min(2, cols),
        minH: 3,
      };
      y += p.layout.h;
      return item;
    });
  };

  return {
    lg,
    md: stack(10),
    sm: stack(6),
    xs: stack(4),
    xxs: stack(2),
  };
}

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
    updatePanelLayouts,
  } = useDashboard("comparisons");

  // Initialize dashboard on mount
  useEffect(() => {
    initDashboard(STATIC_DASHBOARD);
  }, [initDashboard]);

  const { width, containerRef } = useContainerWidth();

  // Disabled tickers (local state)
  const [disabledTickers, setDisabledTickers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("comparisons_disabled_tickers");
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Time range
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");

  // Ticker search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist disabled tickers
  useEffect(() => {
    localStorage.setItem("comparisons_disabled_tickers", JSON.stringify(Array.from(disabledTickers)));
  }, [disabledTickers]);

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

  const handleAddTicker = (symbol: string) => {
    addTicker(symbol);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleRemoveTicker = (symbol: string) => {
    removeTicker(symbol);
    setDisabledTickers((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  };

  const toggleDisabled = (symbol: string) => {
    setDisabledTickers((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const enabledTickers = tickers.filter((t) => !disabledTickers.has(t));

  const handleLayoutChange = useCallback(
    (_currentLayout: any, allLayouts: any) => {
      if (allLayouts?.lg) {
        updatePanelLayouts(allLayouts.lg);
      }
    },
    [updatePanelLayouts]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Filter bar */}
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
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
              <Search size={12} className="text-gray-400" />
              <input
                className="w-28 bg-transparent text-xs focus:outline-none placeholder:text-gray-300"
                placeholder="Add ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleAddTicker(searchResults[0].symbol);
                  }
                }}
              />
              {searchLoading && <RefreshCw size={10} className="text-gray-400 animate-spin" />}
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
              className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded transition-opacity ${
                isDisabled
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              <button
                onClick={() => toggleDisabled(t)}
                className={isDisabled ? "text-gray-400 hover:text-gray-600" : "text-blue-400 hover:text-blue-700"}
                title={isDisabled ? "Enable" : "Disable"}
              >
                {isDisabled ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              {t}
              <button onClick={() => handleRemoveTicker(t)} className={isDisabled ? "hover:text-gray-600" : "hover:text-blue-900"}>
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>

      {/* Grid Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        {dashboard && (
          <Responsive
            className="layout"
            layouts={buildResponsiveLayouts(dashboard.panels)}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            width={width}
            onLayoutChange={handleLayoutChange}
            dragConfig={{ enabled: true, handle: ".panel-drag-handle", cancel: ".panel-refresh-btn" }}
            resizeConfig={{ enabled: true, handles: ["se", "e", "s"] }}
          >
            {dashboard.panels.map((panel: import("../lib/api").PanelConfig) => {
              const typeDef = getPanelType(panel.type);
              const Component = typeDef?.component;
              if (!Component) return <div key={panel.id}>Unknown panel type: {panel.type}</div>;

              // Charts use enabled tickers; grid shows all tickers
              const panelTickers = panel.type === "comparison-grid" ? tickers : enabledTickers;
              const panelInputs = panel.type === "comparison-chart" || panel.type === "rsi-comparison"
                ? { ...panel.inputs, timeRange }
                : panel.inputs;

              return (
                <div key={panel.id} className="h-full w-full">
                  <Component
                    title={panel.title}
                    tickers={panelTickers}
                    enabledTickers={enabledTickers}
                    inputs={panelInputs}
                    refreshKey={(panelRefreshKeys[panel.id] || 0) + globalRefreshKey}
                    onRefresh={() => refreshPanel(panel.id)}
                    description={typeDef?.description}
                  />
                </div>
              );
            })}
          </Responsive>
        )}
      </div>
    </div>
  );
}
