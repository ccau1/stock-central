import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { useDisabledTickers } from "../hooks/useDisabledTickers";
import { useEditMode } from "../hooks/useEditMode";
import { dataApi } from "../lib/api";

import DashboardGrid from "../components/DashboardGrid";
import TickerFilterBar from "../components/TickerFilterBar";

interface DashboardPageProps {
  staticYaml?: string;
  overrideId?: string;
  defaultTimeRange?: string;
  extraHeader?: React.ReactNode;
}

export default function DashboardPage({ staticYaml, overrideId, defaultTimeRange, extraHeader }: DashboardPageProps) {
  const params = useParams();

  const dashboardId = overrideId || params.id || "unknown";
  const storagePrefix = `dashboard_${dashboardId}`;

  const [, setYaml] = useState<string | undefined>(staticYaml);
  const [loading, setLoading] = useState(!staticYaml);
  const [error, setError] = useState<string | null>(null);

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
  } = useDashboard(dashboardId);

  // Load dashboard YAML
  useEffect(() => {
    if (staticYaml) {
      initDashboard(parseDashboardYaml(staticYaml));
      return;
    }

    if (!params.id) return;
    setLoading(true);
    dataApi.getDashboard(params.id)
      .then((record) => {
        setYaml(record.yaml);
        initDashboard(parseDashboardYaml(record.yaml));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [staticYaml, params.id, initDashboard]);

  const {
    disabledTickers,
    handleTickerClick,
    showAll,
    hideAll,
    remove: removeDisabled,
    enabledTickers,
  } = useDisabledTickers(`${storagePrefix}_disabled`);

  const { isEditMode, setIsEditMode } = useEditMode(`${storagePrefix}_edit_mode`);

  const search = useTickerSearch({
    existingTickers: tickers,
    onSelect: (symbol) => {
      addTicker(symbol);
    },
  });

  const handleRemoveTicker = (symbol: string) => {
    removeTicker(symbol);
    removeDisabled(symbol);
  };

  const enabled = enabledTickers(tickers);

  const [timeRange] = useState(defaultTimeRange || "1y");

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-red-500">Failed to load dashboard: {error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Dashboard not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <TickerFilterBar
        tickers={tickers}
        disabledTickers={disabledTickers}
        onTickerClick={(sym) => handleTickerClick(sym, tickers)}
        onRemoveTicker={handleRemoveTicker}
        onShowAll={showAll}
        onHideAll={() => hideAll(tickers)}
        onClear={clearTickers}
        onRefreshAll={refreshAll}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((prev: boolean) => !prev)}
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        searchResults={search.searchResults}
        searchLoading={search.searchLoading}
        showDropdown={search.showDropdown}
        onShowDropdown={search.setShowDropdown}
        onSelectSearchResult={search.handleSelect}
        searchRef={search.searchRef}
        extraControls={extraHeader}
      />

      <DashboardGrid
        panels={dashboard.panels}
        filters={{ tickers, enabledTickers: enabled, timeRange }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
        onLayoutChange={updatePanelLayouts}
        isEditMode={isEditMode}
      />
    </div>
  );
}
