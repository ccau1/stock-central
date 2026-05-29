import { useEffect } from "react";
import { useDashboard, parseDashboardYaml } from "../stores/useDashboardStore";
import { useTickerSearch } from "../hooks/useTickerSearch";
import { useDisabledTickers } from "../hooks/useDisabledTickers";
import { useEditMode } from "../hooks/useEditMode";
import DashboardGrid from "../components/DashboardGrid";
import TickerFilterBar from "../components/TickerFilterBar";
import macroYaml from "../macro.yaml?raw";

const STATIC_DASHBOARD = parseDashboardYaml(macroYaml);

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
    clearTickers,
    updatePanelLayouts,
  } = useDashboard("macro");

  useEffect(() => {
    initDashboard(STATIC_DASHBOARD);
  }, [initDashboard]);

  const {
    disabledTickers,
    handleTickerClick,
    showAll,
    hideAll,
    remove: removeDisabled,
    enabledTickers,
  } = useDisabledTickers("macro_disabled_tickers");

  const { isEditMode, setIsEditMode } = useEditMode("macro_edit_mode");

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
      />

      <DashboardGrid
        panels={dashboard.panels}
        filters={{ tickers, enabledTickers: enabled }}
        globalRefreshKey={globalRefreshKey}
        panelRefreshKeys={panelRefreshKeys}
        onRefreshPanel={refreshPanel}
        onLayoutChange={updatePanelLayouts}
        isEditMode={isEditMode}
      />
    </div>
  );
}
