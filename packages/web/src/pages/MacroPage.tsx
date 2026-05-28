import { useState, useEffect, useRef, useCallback } from "react";
import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { RefreshCw, X, Search } from "lucide-react";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { getPanelType } from "../panel-registry";
import { dataApi } from "../lib/api";
import type { TickerSearchResult } from "../lib/api";
import macroYaml from "../macro.yaml?raw";

const STATIC_DASHBOARD = parseDashboardYaml(macroYaml);

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

export default function MacroPage() {
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
  } = useDashboard("macro");

  // Initialize dashboard on mount
  useEffect(() => {
    initDashboard(STATIC_DASHBOARD);
  }, [initDashboard]);

  const { width, containerRef } = useContainerWidth();

  // Ticker search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSelectTicker = (symbol: string) => {
    addTicker(symbol);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

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
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
          <span className="text-xs text-gray-500 font-medium mr-1">Tickers:</span>
          {tickers.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded"
            >
              {t}
              <button onClick={() => removeTicker(t)} className="hover:text-blue-900">
                <X size={10} />
              </button>
            </span>
          ))}

          {/* Search input with dropdown */}
          <div ref={searchRef} className="relative ml-1">
            <div className="flex items-center">
              <Search size={10} className="text-gray-400 mr-1" />
              <input
                className="w-24 bg-transparent text-xs focus:outline-none placeholder:text-gray-300"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleSelectTicker(searchResults[0].symbol);
                  }
                  if (e.key === "Backspace" && searchQuery === "" && tickers.length > 0) {
                    removeTicker(tickers[tickers.length - 1]);
                  }
                }}
              />
              {searchLoading && (
                <RefreshCw size={10} className="text-gray-400 animate-spin ml-1" />
              )}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelectTicker(r.symbol)}
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
        </div>

        {/* Global Refresh */}
        <button
          onClick={refreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw size={12} />
          Refresh All
        </button>
      </header>

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

              return (
                <div key={panel.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <Component
                    title={panel.title}
                    tickers={tickers}
                    inputs={panel.inputs}
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
